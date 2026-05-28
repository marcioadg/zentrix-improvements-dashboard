import React from 'react';
import { CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Email Verified Success Page
 * 
 * Shown to users who click email verification links from a mobile BROWSER
 * (not the native app). This guides them back to the app to complete onboarding.
 * 
 * Web users and native app users never see this page - they go directly to /onboarding.
 */
const EmailVerified: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-6">
      <div className="text-center space-y-6 max-w-sm">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        
        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Email Verified!
          </h1>
          <p className="text-muted-foreground">
            Your account has been verified successfully.
          </p>
        </div>
        
        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" />
            <span className="font-medium">Return to the App</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Please go back to the Zentrix app to complete your account setup and start using all features.
          </p>
        </div>
        
        {/* Deep link button (works if universal links are configured) */}
        <Button 
          onClick={() => window.location.href = 'zentrix://verified'}
          className="w-full"
          size="lg"
        >
          Open Zentrix App
        </Button>
        
        <p className="text-xs text-muted-foreground">
          If the button doesn't work, manually open the Zentrix app on your device.
        </p>
      </div>
    </div>
  );
};

export default EmailVerified;
