
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, Mail, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedInvitationLoadingScreenProps {
  debugLogs?: string[];
  onRetry?: () => void;
}

export const EnhancedInvitationLoadingScreen: React.FC<EnhancedInvitationLoadingScreenProps> = ({
  debugLogs = [],
  onRetry
}) => {
  const [searchParams] = useSearchParams();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [authStatus, setAuthStatus] = useState<{
    hasSession: boolean;
    userId?: string;
    email?: string;
  }>({ hasSession: false });
  const [showResendOption, setShowResendOption] = useState(false);

  // Show debug panel if debug=true in URL
  const isDebugMode = searchParams.get('debug') === 'true';

  // Timer to track how long user has been waiting
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingTime(prev => {
        const newTime = prev + 1;
        // Show resend option after 2 minutes
        if (newTime >= 120) {
          setShowResendOption(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthStatus({
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthStatus({
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResendEmail = () => {
    // For now, just show instructions. In a real app, this would trigger a resend
    window.open('mailto:support@yourcompany.com?subject=Resend Invitation&body=Please resend my invitation email.', '_blank');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} minute${mins > 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
    }
    return `${secs} second${secs !== 1 ? 's' : ''}`;
  };

  const invitationEmail = searchParams.get('email');
  const companyName = searchParams.get('company_name');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <Card className="w-full max-w-lg p-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Complete Your Invitation
          </CardTitle>
          <CardDescription className="text-lg">
            {companyName ? `Welcome to ${companyName}!` : 'Welcome aboard!'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          {/* Main instruction */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Invitation email sent successfully</span>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-secondary-foreground font-medium mb-2">Next step:</p>
              <p className="text-secondary-foreground">
                Check your email at <strong>{invitationEmail}</strong> and click the verification link to complete your account setup.
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Waiting for {formatTime(waitingTime)}</span>
            </div>
            
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000 animate-pulse" 
                style={{ width: '30%' }}
              />
            </div>
          </div>

          {/* Email tips */}
          <Alert>
            <Mail className="w-4 h-4" />
            <AlertDescription>
              <strong>Don't see the email?</strong> Check your spam or junk folder. 
              The email should arrive within a few minutes.
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="space-y-3">
            {showResendOption && (
              <Button 
                onClick={handleResendEmail}
                variant="outline" 
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Request New Invitation
              </Button>
            )}

            <Button 
              onClick={() => window.location.reload()}
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>

          {/* Status messages based on waiting time */}
          {waitingTime > 60 && waitingTime < 120 && (
            <div className="text-amber-600 text-sm">
              <p>Still waiting? The verification email should arrive soon. Make sure to check your spam folder.</p>
            </div>
          )}

          {waitingTime >= 120 && (
            <div className="text-warning text-sm">
              <p>It's taking longer than expected. You can request a new invitation above or contact your administrator.</p>
            </div>
          )}

          {/* Debug information - only show in debug mode or when specifically requested */}
          {(isDebugMode || showDebugInfo) && (
            <Collapsible>
              <CollapsibleTrigger
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${showDebugInfo ? 'rotate-180' : ''}`} />
                {showDebugInfo ? 'Hide' : 'Show'} Technical Details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted p-3 rounded text-xs font-mono text-left max-h-40 overflow-y-auto space-y-2">
                  <div>
                    <p className="font-medium mb-1">System Status:</p>
                    <p className={authStatus.hasSession ? 'text-success' : 'text-destructive'}>
                      Authentication: {authStatus.hasSession ? 'Active' : 'Pending'}
                    </p>
                    <p>Invitation Type: {searchParams.get('type')}</p>
                    <p>Email: {invitationEmail}</p>
                    {authStatus.email && <p>Verified Email: {authStatus.email}</p>}
                  </div>
                  
                  {debugLogs.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Debug Logs:</p>
                      {debugLogs.slice(-5).map((log, index) => (
                        <p key={index} className="text-xs break-all">
                          {log}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Help text */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>
              Need help? Contact your administrator or the person who sent you this invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
