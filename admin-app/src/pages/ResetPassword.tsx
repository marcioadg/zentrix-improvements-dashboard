
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { addMembersToTeam } from '@/services/teamMemberService';
import { robustSignOut } from '@/utils/authCleanup';
import { checkUserNeedsOnboarding } from '@/services/onboardingService';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/utils/logger';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState('');
  
  // Check if this is an invitation flow
  const isInvitationFlow = searchParams.get('type') === 'invite';
  const invitationData = isInvitationFlow ? {
    email: searchParams.get('email') || '',
    fullName: searchParams.get('full_name') || '',
    companyName: searchParams.get('company_name') || '',
    invitedBy: searchParams.get('invited_by') || '',
    companyId: searchParams.get('company_id') || undefined,
    teamIds: searchParams.get('team_ids')?.split(',').filter(Boolean) || []
  } : null;

  useEffect(() => {
    const checkSession = async () => {
      logger.log('🔐 ResetPassword: Checking session...');
      logger.log('🔐 ResetPassword: URL search params:', searchParams.toString());
      logger.log('🔐 ResetPassword: URL hash:', window.location.hash);
      logger.log('🔐 ResetPassword: Is invitation flow:', isInvitationFlow);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        logger.log('🔐 ResetPassword: Session check result:', { session: !!session, error });
        
        if (error) {
          logger.error('❌ ResetPassword: Session error:', error);
          setError('Session error: ' + error.message);
        }
        
        // For recovery flows, we need a session (user is authenticated with recovery token)
        // For invitation flows, session might not exist yet
        if (!session && !isInvitationFlow) {
          logger.log('🔐 ResetPassword: No session and not invitation flow, checking URL params for recovery');
          
          // Check if this came from a recovery link that hasn't been processed yet
          const hash = window.location.hash;
          const hasRecoveryParams = hash.includes('type=recovery') || 
                                   searchParams.get('type') === 'recovery' ||
                                   hash.includes('access_token');
          
          if (hasRecoveryParams && hash.includes('access_token')) {
            logger.log('🔐 ResetPassword: Recovery hash detected, establishing session...');
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken && refreshToken) {
              // Clear hash to prevent re-processing
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              
              const { data, error: sessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (sessionErr) {
                logger.error('🔐 ResetPassword: Recovery setSession failed:', sessionErr.message);
                // Try getSession as fallback — session may already be established via onAuthStateChange
                const { data: { session: fallbackSession } } = await supabase.auth.getSession();
                if (fallbackSession) {
                  logger.log('🔐 ResetPassword: Fallback session found');
                  setHasValidSession(true);
                  setSessionChecked(true);
                  return;
                }
                setError('Recovery link may have expired. Please request a new one.');
                setSessionChecked(true);
                return;
              }
              
              logger.log('🔐 ResetPassword: Recovery session established:', data.user?.email);
              setHasValidSession(true);
              setSessionChecked(true);
              return;
            }
          }
          
          if (hasRecoveryParams) {
            logger.log('🔐 ResetPassword: Recovery params detected, allowing access');
            setHasValidSession(true);
            setSessionChecked(true);
            return;
          }
          
          logger.log('🔐 ResetPassword: No recovery params, redirecting to forgot password');
          toast({
            title: "Invalid Reset Link",
            description: "This reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          navigate('/forgot-password');
          return;
        }
        
        setHasValidSession(!!session);
        setSessionChecked(true);
        
      } catch (error) {
        logger.error('❌ ResetPassword: Error checking session:', error);
        setError('Error checking session: ' + (error as Error).message);
        setSessionChecked(true);
      }
    };

    checkSession();
  }, [navigate, isInvitationFlow, searchParams, toast]);

  const createTeamMemberships = async (userId: string) => {
    if (!invitationData?.teamIds || invitationData.teamIds.length === 0) {
      logger.log('📝 No team assignments to create');
      return;
    }

    try {
      logger.log('📝 Creating team memberships for user:', userId, 'teams:', invitationData.teamIds);
      
      // Add user to each selected team
      for (const teamId of invitationData.teamIds) {
        await addMembersToTeam(teamId, [userId]);
        logger.log('✅ Added user to team:', teamId);
      }
      
      logger.log('✅ All team memberships created successfully');
    } catch (error) {
      logger.error('❌ Error creating team memberships:', error);
      // Don't fail the entire process if team assignment fails
      toast({
        title: "Warning",
        description: "Password updated successfully, but there was an issue assigning teams. Please contact your administrator.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      logger.log('🔐 ResetPassword: Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        logger.error('❌ ResetPassword: Password update error:', error);
        setError(error.message);
        return;
      }

      logger.log('✅ ResetPassword: Password updated successfully');

      // Get current user to create team memberships
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isInvitationFlow && invitationData && user) {
        // Create team memberships for invitation flow
        await createTeamMemberships(user.id);
        
        const teamText = invitationData.teamIds.length > 0 
          ? ` You've been assigned to ${invitationData.teamIds.length} team${invitationData.teamIds.length !== 1 ? 's' : ''}.`
          : '';
        
        toast({
          title: "Welcome!",
          description: `Your password has been set! Welcome to ${invitationData.companyName}!${teamText}`,
        });
        
        logger.log('✅ ResetPassword: Password reset completed, redirecting to dashboard');
        // Navigate to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        toast({
          title: "Success",
          description: "Your password has been updated successfully.",
        });
        
        // Check if user needs onboarding before redirecting
        logger.log('🔍 ResetPassword: Checking if user needs onboarding...');
        const needsOnboarding = await checkUserNeedsOnboarding();
        
        if (needsOnboarding) {
          logger.log('✅ ResetPassword: User needs onboarding, redirecting to /onboarding');
          navigate('/onboarding');
        } else {
          logger.log('✅ ResetPassword: User has company, redirecting to /dashboard');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      logger.error('❌ ResetPassword: Error updating password:', error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = async () => {
    logger.log('🔐 ResetPassword: Back to Sign In clicked, signing out...');
    
    try {
      // Clear recovery flags defensively
      sessionStorage.removeItem('password_recovery_initiated');
    } catch {}
    
    // Sign out completely and reload to login
    await robustSignOut();
    window.location.href = '/login';
  };

  // Show loading state while checking session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-8">
        <Card className="w-full max-w-md p-8">
          <CardContent className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <Card className="w-full max-w-md p-8">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isInvitationFlow ? `Join ${invitationData?.companyName}` : 'Reset Your Password'}
          </CardTitle>
          <CardDescription>
            {isInvitationFlow 
              ? 'Set your password to complete your invitation'
              : 'Enter your new password below'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Session Status */}
          {sessionChecked && (
            <Alert className={`mb-6 ${hasValidSession ? 'border-green-200 bg-success/5' : 'border-yellow-200 bg-warning/5'}`}>
              {hasValidSession ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <AlertDescription className={hasValidSession ? 'text-success' : 'text-yellow-700'}>
                {hasValidSession ? 'Reset link verified successfully' : 'No active session - invitation flow'}
              </AlertDescription>
            </Alert>
          )}

          {isInvitationFlow && invitationData && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Setting up access for:</p>
              <p className="font-medium">{invitationData.fullName}</p>
              <p className="text-sm text-muted-foreground">{invitationData.email}</p>
              <p className="text-xs text-primary mt-2">✓ Invitation verified</p>
              {invitationData.teamIds.length > 0 && (
                <p className="text-xs text-success mt-1">
                  ✓ Will be assigned to {invitationData.teamIds.length} team{invitationData.teamIds.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </div>
            
            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-white" />
                  Updating Password...
                </>
              ) : (
                isInvitationFlow ? `Set Password & Join ${invitationData?.companyName}` : "Update Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleBackToSignIn}
              className="text-sm text-muted-foreground hover:text-foreground underline bg-transparent border-none cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>

          {/* Development Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Debug Information:</h4>
              <div className="text-xs space-y-1 text-secondary-foreground">
                <p><strong>Has Session:</strong> {hasValidSession ? 'Yes' : 'No'}</p>
                <p><strong>Is Invitation:</strong> {isInvitationFlow ? 'Yes' : 'No'}</p>
                <p><strong>URL Params:</strong> {searchParams.toString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
