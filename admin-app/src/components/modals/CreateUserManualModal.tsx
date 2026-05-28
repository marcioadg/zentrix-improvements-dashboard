import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleSelector } from '@/components/shared/RoleSelector';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CreateUserManualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export const CreateUserManualModal: React.FC<CreateUserManualModalProps> = ({
  open,
  onOpenChange,
  onUserCreated,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();

  const handleSubmit = async () => {
    if (!user || !currentCompany) {
      toast({
        title: "Error",
        description: "You must be logged in and have a company selected",
        variant: "destructive",
      });
      return;
    }

    if (!email || !password || !fullName) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLastError(null);
    setDebugInfo(null);
    
    logger.log('🔄 Creating manual user account for:', email);
    logger.log('🔍 Current user permissions:', {
      userId: user.id,
      userEmail: user.email,
      profileRole: profile?.role,
      companyId: currentCompany?.id,
      companyName: currentCompany?.name,
    });

    try {
      // Get the auth token to pass to the Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        logger.error('❌ Session error:', sessionError);
        throw new Error('Authentication session invalid. Please sign out and back in.');
      }

      logger.log('🔍 Calling create-user-manual Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('create-user-manual', {
        body: {
          email,
          password,
          fullName,
          role,
          companyId: currentCompany?.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      logger.log('🔍 Edge function response:', { data, error });
      
      setDebugInfo({
        requestData: {
          email,
          fullName,
          role,
          companyId: currentCompany?.id,
          hasValidSession: !!session?.access_token,
          userRole: profile?.role,
        },
        responseData: data,
        responseError: error,
      });

      if (error) {
        logger.error('❌ Edge function error:', error);
        
        // For FunctionsHttpError, the real error details might be in the response data
        // even if the client reports an error due to non-2xx status
        if (error.message?.includes('non-2xx status code') && data) {
          logger.log('🔍 Checking response data for detailed error:', data);
          // Use the response data which contains the actual error details
          if (data.error) {
            setLastError(data.details ? `${data.error}\n\nDetails: ${data.details}` : data.error);
            throw new Error(data.error);
          }
        }
        
        // Enhanced error handling with detailed error information
        let errorMessage = 'Failed to create user account. Please try again.';
        
        if (error.message?.includes('FunctionsHttpError')) {
          errorMessage = `Server Error: The function failed to execute properly. This may be a temporary issue.`;
        } else if (error.message?.includes('FunctionsRelayError')) {
          errorMessage = `Connection Error: Unable to reach the user creation service. Please check your connection and try again.`;
        } else if (error.message?.includes('FunctionsFetchError')) {
          errorMessage = `Network Error: Unable to connect to the server. Please check your internet connection.`;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // If we have detailed error information from the function response
        if (data && typeof data === 'object') {
          if (data.error) {
            errorMessage = data.error;
          }
          if (data.details) {
            logger.error('❌ Detailed error from function:', data.details);
            setLastError(`${errorMessage}\n\nDetails: ${data.details}`);
          }
        }
        
        if (!lastError) {
          setLastError(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      if (data?.error) {
        logger.error('❌ Response error:', data.error);
        const errorMsg = data.details ? `${data.error}\n\nDetails: ${data.details}` : data.error;
        setLastError(errorMsg);
        throw new Error(data.error);
      }

      if (!data?.success) {
        logger.error('❌ Function returned unsuccessful response:', data);
        const errorMsg = data?.error || 'User creation was not successful';
        setLastError(errorMsg);
        throw new Error(errorMsg);
      }

      logger.log('✅ User created successfully:', data);

      toast({
        title: "Success",
        description: data.message || `User account created for ${email}. They can now login with their email and password.`,
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('member');
      setLastError(null);
      setDebugInfo(null);
      
      onUserCreated();
      onOpenChange(false);

    } catch (error: any) {
      logger.error('❌ Failed to create user:', error);
      const errorMessage = error.message || "Failed to create user account. Please try again.";
      
      if (!lastError) {
        setLastError(errorMessage);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('member');
    setLastError(null);
    setDebugInfo(null);
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create User Account"
      description="Create a new user account manually. The user will be able to login immediately with the credentials you provide."
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Create Account"
      loading={isSubmitting}
      submitDisabled={!email || !password || !fullName}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            You will need to provide this password to the user manually
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Permission Level</Label>
          <RoleSelector
            selectedRole={role}
            onRoleChange={setRole}
            disabled={isSubmitting}
            className="w-full"
          />
        </div>

        {/* Enhanced error display with more details */}
        {lastError && (
          <div className="p-3 bg-destructive/5 rounded-lg border border-red-200 space-y-2">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {lastError}
            </p>
            {debugInfo && (
              <details className="text-xs text-red-700">
                <summary className="cursor-pointer font-medium">Debug Information</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Current user permissions info */}
        <div className="p-3 bg-primary/5 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Your Permissions:</strong> {profile?.role || 'Unknown'} role in {currentCompany?.name}
          </p>
          <p className="text-xs text-primary mt-1">
            Note: You need to be an owner, admin, manager, or super_admin to create user accounts.
          </p>
        </div>

        <div className="p-3 bg-primary/5 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The user account will be created immediately and they can login right away. 
            Make sure to provide them with their email and password through your preferred communication method.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
