import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface MeetingError {
  type: 'auth' | 'permission' | 'network' | 'unknown';
  message: string;
  code?: string;
  teamId?: string;
  canJoinAsObserver?: boolean;
}

export interface ErrorHandlingResult {
  error: MeetingError;
  actions: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: 'retry' | 'join_observer' | 'contact_admin' | 'navigate';
  data?: any;
}

export class MeetingErrorHandler {
  static async analyzeMeetingError(error: any, teamId: string): Promise<ErrorHandlingResult> {
    logger.log('🔍 Analyzing meeting error:', { error, teamId });

    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: {
          type: 'auth',
          message: 'You must be logged in to start meetings',
          teamId
        },
        actions: [
          { label: 'Login', action: 'navigate', data: { path: '/auth' } }
        ]
      };
    }

    // Use the enhanced debug function to get detailed auth info
    const debugInfo = await this.getDebugInfo(teamId);
    logger.log('🔍 Debug info:', debugInfo);

    // Parse the error message and code
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || error?.status;

    // Analyze based on error patterns and debug info
    if (errorMessage.includes('row-level security') || errorCode === '42501') {
      return this.handleRLSError(debugInfo, teamId);
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return this.handlePermissionError(debugInfo, teamId);
    }

    if (errorMessage.includes('network') || errorCode === 'NETWORK_ERROR') {
      return {
        error: {
          type: 'network',
          message: 'Network connection issue. Please check your internet connection.',
          teamId
        },
        actions: [
          { label: 'Retry', action: 'retry' }
        ]
      };
    }

    // Default unknown error
    return {
      error: {
        type: 'unknown',
        message: `Unexpected error: ${errorMessage}`,
        code: errorCode,
        teamId
      },
      actions: [
        { label: 'Retry', action: 'retry' },
        { label: 'Contact Support', action: 'contact_admin' }
      ]
    };
  }

  private static async getDebugInfo(teamId: string) {
    try {
      const { data, error } = await supabase.rpc('debug_meeting_auth_enhanced', {
        p_team_id: teamId
      });
      
      if (error) {
        logger.warn('Debug info unavailable:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      logger.warn('Failed to get debug info:', error);
      return null;
    }
  }

  private static handleRLSError(debugInfo: any, teamId: string): ErrorHandlingResult {
    if (!debugInfo) {
      return {
        error: {
          type: 'permission',
          message: 'Access denied. Unable to determine permissions.',
          teamId
        },
        actions: [
          { label: 'Contact Team Admin', action: 'contact_admin' }
        ]
      };
    }

    const { is_team_member, has_director_access, team_exists } = debugInfo;

    if (!team_exists) {
      return {
        error: {
          type: 'permission',
          message: 'Team not found or you do not have access to this team.',
          teamId
        },
        actions: [
          { label: 'Go to Teams', action: 'navigate', data: { path: '/teams' } }
        ]
      };
    }

    if (!is_team_member && !has_director_access) {
      return {
        error: {
          type: 'permission',
          message: 'You are not a member of this team.',
          teamId,
          canJoinAsObserver: has_director_access
        },
        actions: [
          ...(has_director_access 
            ? [{ label: 'Join as Observer', action: 'join_observer' as const }] 
            : []
          ),
          { label: 'Request Access', action: 'contact_admin' },
          { label: 'Go to Teams', action: 'navigate', data: { path: '/teams' } }
        ]
      };
    }

    // Has access but still getting RLS error - might be a temporary issue
    return {
      error: {
        type: 'permission',
        message: 'Temporary permission issue. Please try again.',
        teamId
      },
      actions: [
        { label: 'Retry', action: 'retry' },
        { label: 'Contact Support', action: 'contact_admin' }
      ]
    };
  }

  private static handlePermissionError(debugInfo: any, teamId: string): ErrorHandlingResult {
    return this.handleRLSError(debugInfo, teamId);
  }

  static async joinAsTemporaryObserver(teamId: string, meetingId: string): Promise<boolean> {
    try {
      logger.log('🔄 Requesting temporary observer access:', { teamId, meetingId });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return false;
      }

      const { data, error } = await supabase.rpc('add_temporary_observer', {
        p_user_id: user.id,
        p_team_id: teamId,
        p_meeting_id: meetingId
      });

      if (error) {
        logger.error('Failed to join as observer:', error);
        toast.error('Failed to join as observer: ' + error.message);
        return false;
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to join as observer');
        return false;
      }

      toast.success('Joined meeting as observer');
      return true;
    } catch (error) {
      logger.error('Error joining as observer:', error);
      toast.error('Failed to join as observer');
      return false;
    }
  }

  static async cleanupTemporaryObservers(meetingId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_temporary_observers', {
        p_meeting_id: meetingId
      });

      if (error) {
        logger.warn('Failed to cleanup temporary observers:', error);
      } else {
        logger.log('✅ Cleaned up temporary observers for meeting:', meetingId);
      }
    } catch (error) {
      logger.warn('Error during observer cleanup:', error);
    }
  }
}