
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, Mail, Home, LogIn, AlertTriangle } from 'lucide-react';

interface InvitationError {
  type: 'expired' | 'invalid' | 'network' | 'developer' | 'unknown';
  message: string;
  details?: string;
}

interface EnhancedInvitationErrorScreenProps {
  error: InvitationError;
  debugLogs?: string[];
  onRetry?: () => void;
  invitationEmail?: string;
}

export const EnhancedInvitationErrorScreen: React.FC<EnhancedInvitationErrorScreenProps> = ({
  error,
  debugLogs = [],
  onRetry,
  invitationEmail
}) => {
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Get error display info based on error type
  const getErrorDisplayInfo = (error: InvitationError) => {
    switch (error.type) {
      case 'expired':
        return {
          title: 'Invitation Expired',
          description: 'This invitation link has expired',
          actionText: 'Try Again',
          showResendOption: true
        };
      case 'invalid':
        return {
          title: 'Invalid Invitation',
          description: 'This invitation link is not valid',
          actionText: 'Try Again',
          showResendOption: true
        };
      case 'network':
        return {
          title: 'Connection Error',
          description: 'Unable to process invitation due to network error',
          actionText: 'Retry',
          showResendOption: false
        };
      case 'developer':
        return {
          title: 'Developer Configuration Error',
          description: 'There is a configuration issue with the invitation system',
          actionText: 'Retry',
          showResendOption: false
        };
      default:
        return {
          title: 'Invitation Error',
          description: 'There was a problem processing your invitation',
          actionText: 'Try Again',
          showResendOption: true
        };
    }
  };

  const errorInfo = getErrorDisplayInfo(error);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Invitation Link Issue');
    const body = encodeURIComponent(`I'm having trouble with my invitation link. Error: ${error.message}\n\nEmail: ${invitationEmail || 'Not provided'}\n\nError Type: ${error.type}`);
    window.open(`mailto:support@zentrixos.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <Card className="w-full max-w-md p-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            {errorInfo.title}
          </CardTitle>
          <CardDescription>
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          {error.details && (
            <Alert>
              <AlertDescription>
                {error.details}
              </AlertDescription>
            </Alert>
          )}

          {invitationEmail && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Invitation sent to:</p>
              <p className="font-medium">{invitationEmail}</p>
            </div>
          )}

          {/* Enhanced error-specific messaging */}
          {error.type === 'expired' && (
            <Alert className="text-left">
              <AlertDescription>
                <strong>What happened?</strong><br />
                Your invitation link has expired after 24 hours for security reasons.
                <br /><br />
                <strong>What to do:</strong><br />
                Contact your administrator to send you a new invitation link.
              </AlertDescription>
            </Alert>
          )}

          {error.type === 'invalid' && error.message.includes('already used') && (
            <Alert className="text-left">
              <AlertDescription>
                <strong>What happened?</strong><br />
                This invitation has already been used to create an account.
                <br /><br />
                <strong>What to do:</strong><br />
                Try signing in with your existing account instead.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            {onRetry && (
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {errorInfo.actionText}
                  </>
                )}
              </Button>
            )}

            {errorInfo.showResendOption && (
              <Button 
                onClick={handleContactSupport}
                variant="outline" 
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Administrator
              </Button>
            )}

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Need immediate help?
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your system administrator or the person who sent you this invitation. Include the error details below if requested.
            </p>
          </div>

          {debugLogs.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger
                onClick={() => setShowDebugLogs(!showDebugLogs)}
                className="flex items-center justify-center w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${showDebugLogs ? 'rotate-180' : ''}`} />
                {showDebugLogs ? 'Hide' : 'Show'} Technical Details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-muted p-3 rounded text-xs font-mono text-left max-h-32 overflow-y-auto">
                  <p className="font-medium mb-2">Error Information:</p>
                  <p>Type: {error.type}</p>
                  <p>Message: {error.message}</p>
                  
                  {debugLogs.length > 0 && (
                    <>
                      <p className="font-medium mt-3 mb-2">Debug Information:</p>
                      {debugLogs.slice(-5).map((log, index) => (
                        <p key={index} className="text-xs break-all mb-1">
                          {log}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
