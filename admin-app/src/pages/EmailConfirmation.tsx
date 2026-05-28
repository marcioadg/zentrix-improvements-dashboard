import React, { useEffect } from 'react';

// Legacy forwarder: keep old email links working by forwarding everything to /auth/callback
const EmailConfirmation: React.FC = () => {
  useEffect(() => {
    try {
      const target = `${window.location.origin}/auth/callback${window.location.search || ''}${window.location.hash || ''}`;
      window.location.replace(target);
    } catch (e) {
      // As a last resort, just go to callback
      window.location.replace(`${window.location.origin}/auth/callback`);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-8">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-b-transparent border-primary mx-auto" />
        <div className="text-sm text-muted-foreground">Redirecting...</div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
