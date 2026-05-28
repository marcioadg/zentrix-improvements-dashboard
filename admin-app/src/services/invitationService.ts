
import { supabase } from '@/integrations/supabase/client';
import { trackTeamMemberInvited } from '@/lib/statsigAnalytics';
import { logger } from '@/utils/logger';

export interface InvitationRequest {
  email: string;
  fullName?: string; // Now optional
  companyId: string;
  teamIds?: string[];
  invitedBy?: string; // Now optional - will be overridden by authenticated user
  permissionLevel?: string;
}

export interface InvitationResponse {
  success: boolean;
  error?: string;
  invitationId?: string;
  userExists?: boolean;
  message?: string;
  inviteLink?: string;
}

export const sendInvitation = async (request: InvitationRequest): Promise<InvitationResponse> => {
  logger.log('📧 sendInvitation: Using company_members table for invitation', request);
  
  try {
    // Validate input
    if (!request.email || !request.companyId) {
      throw new Error('Missing required fields for invitation (email, companyId)');
    }
    
    // Normalize email to lowercase for consistent matching
    const normalizedEmail = request.email.trim().toLowerCase();
    
    // Check if user already exists in the system (case-insensitive)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    // Check if there's already a pending invitation or active membership (case-insensitive)
    const { data: existingMembership } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', request.companyId)
      .or(`email.ilike.${normalizedEmail},user_id.eq.${existingUser?.id || 'null'}`)
      .maybeSingle();

    if (existingMembership) {
      const userDisplay = existingUser?.full_name || normalizedEmail;
      
      if (existingMembership.status === 'pending') {
        return {
          success: false,
          error: `${userDisplay} already has a pending invitation to this company`
        };
      } else if (existingMembership.status === 'active') {
        return {
          success: false,
          error: `${userDisplay} is already a member of this company`
        };
      } else if (existingMembership.status === 'declined') {
        return {
          success: false,
          error: `${userDisplay} previously declined an invitation. Please remove them first to send a new invitation.`
        };
      }
    }

    // Get company name for the invitation
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', request.companyId)
      .single();

    // Get inviter name
    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', request.invitedBy)
      .single();

    // Send invitation via edge function (which handles all database writes)
    const { data: result, error: emailError } = await supabase.functions.invoke('os-invite-user', {
      body: {
        email: normalizedEmail,
        fullName: request.fullName || '',
        companyId: request.companyId,
        invitedBy: request.invitedBy,
        teamIds: request.teamIds,
        permissionLevel: request.permissionLevel,
        siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
      }
    });

    if (emailError) {
      logger.error('❌ sendInvitation: Edge function error:', emailError);
      
      // Map specific errors to user-friendly messages
      if (emailError.message?.includes('Insufficient permissions') || 
          emailError.status === 403 || emailError.status === 401) {
        return {
          success: false,
          error: 'Only managers or above can send invitations'
        };
      }
      
      return {
        success: false,
        error: emailError.message || 'Failed to send invitation'
      };
    }

    logger.log('✅ sendInvitation: Edge function responded', result);

    if (result && result.success === false) {
      return {
        success: false,
        error: result.error || 'Failed to send invitation'
      };
    }

    logger.log('✅ sendInvitation: Invitation sent successfully via edge function');
    
    // Track team member invited (non-blocking)
    try {
      trackTeamMemberInvited({
        user_id: request.invitedBy,
        company_id: request.companyId,
        invited_email: normalizedEmail,
        role: request.permissionLevel,
      });
    } catch (e) {
      // Non-blocking
    }
    
    return {
      success: true,
      invitationId: result?.invitationId,
      userExists: !!existingUser,
      message: `Invitation sent to ${normalizedEmail} for ${company?.name || 'the company'}`,
      inviteLink: result?.inviteLink,
    };
  } catch (error) {
    logger.error('💥 sendInvitation: Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const resendInvitation = async (invitationId: string): Promise<InvitationResponse> => {
  logger.log('🔄 resendInvitation: Feature not implemented for Supabase native invitations');
  
  // For Supabase native invitations, we would need to fetch the original invitation
  // details and call invite-user again, but this is typically not needed since
  // Supabase handles invitation expiry and resending automatically
  
  return {
    success: false,
    error: 'Resend not available for Supabase native invitations. Please create a new invitation.'
  };
};
