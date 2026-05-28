
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { logger } from '@/utils/logger';

export const ForgotPassword = () => {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  // Check if user is in a password recovery flow  
  const isPasswordRecovery = () => {
    try {
      return sessionStorage.getItem('password_recovery_initiated') === 'true' ||
             window.location.pathname === '/reset-password' ||
             window.location.hash.includes('type=recovery') ||
             window.location.search.includes('type=recovery');
    } catch {
      return false;
    }
  };

  if (user && !isPasswordRecovery()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    logger.log('🔐 Starting password reset flow for:', email);

    try {
      const { error: resetError } = await resetPassword(email);
      
      if (resetError) {
        logger.error('❌ Reset password error:', resetError);
        
        let errorMessage = 'An error occurred while sending the reset email. Please try again.';
        
        if (resetError.message.includes('not found') || resetError.message.includes('invalid')) {
          errorMessage = 'No account found with this email address. Please check your email or sign up for a new account.';
        } else if (resetError.message.includes('rate limit') || resetError.message.includes('too many')) {
          errorMessage = 'Too many reset attempts. Please wait a few minutes before trying again.';
        }
        
        setError(errorMessage);
        toast({
          title: "Reset Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      logger.log('✅ Password reset email sent successfully');
      setEmailSent(true);
      
      toast({
        title: "Reset email sent!",
        description: "Check your email for instructions to reset your password.",
      });
      
    } catch (error) {
      logger.error('❌ Unexpected error in forgot password:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8 animate-fade-in">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="p-12">
          <CardHeader className="text-center p-0 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Link 
                to="/login" 
                className="absolute left-4 top-4 p-2 hover:bg-muted rounded-full transition-colors"
                title="Back to login"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight mb-2">
              Zentrix OS
            </CardTitle>
            <CardDescription className="text-lg">
              {emailSent ? "Check your email" : "Reset your password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-status-success/10 p-3">
                    <CheckCircle className="h-8 w-8 text-status-success" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to reset your password. If you don't see it, check your spam folder.
                  </p>
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-2 text-accent">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Email sent successfully!</span>
                    </div>
                    <p className="text-xs text-accent mt-1">
                      The link will expire in 1 hour for security purposes.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={handleResendEmail}
                    className="w-full h-14 text-base"
                  >
                    Send another email
                  </Button>
                  
                  <div className="text-center">
                    <Link 
                      to="/login" 
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Back to login
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold tracking-tight">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    inputMode="email"
                    required
                    className="h-14 text-base"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email address associated with your account and we'll send you a link to reset your password.
                  </p>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent border-white" />
                      Sending...
                    </>
                  ) : (
                    "Send reset email"
                  )}
                </Button>
                
                <div className="text-center">
                  <Link 
                    to="/login" 
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Remember your password? Sign in
                  </Link>
                </div>
              </form>
            )}

            {/* Help Section */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">Need Help?</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• The email may take a few minutes to arrive (especially on first send)</p>
                <p>• Make sure to check your spam/junk folder</p>
                <p>• The reset link expires after 1 hour</p>
                <p>• Contact support if you continue having issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
