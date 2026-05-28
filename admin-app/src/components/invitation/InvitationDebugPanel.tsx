
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Copy, CheckCircle, XCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

export const InvitationDebugPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const urlParams = Object.fromEntries(searchParams.entries());
  
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      setAuthState({
        hasSession: !!session,
        sessionError: error,
        user: user,
        session: session,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Debug panel auth check failed:', error);
      setAuthState({ error: error });
    } finally {
      setLoading(false);
    }
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      url: window.location.href,
      urlParams,
      authState,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateParams = () => {
    const required = ['type', 'email'];
    const missing = required.filter(param => !urlParams[param]);
    return {
      isValid: missing.length === 0,
      missing,
      hasAll: Object.keys(urlParams).length > 0
    };
  };

  const validation = validateParams();

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🐛 Invitation Debug Panel
          <Button
            onClick={checkAuthState}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Parameters */}
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            URL Parameters
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
          </h3>
          <div className="bg-muted p-3 rounded space-y-1">
            {Object.entries(urlParams).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-mono">{key}:</span>
                <span className="text-right">{value || <Badge variant="destructive">Missing</Badge>}</span>
              </div>
            ))}
            {!validation.hasAll && (
              <p className="text-destructive text-sm">No URL parameters found!</p>
            )}
            {validation.missing.length > 0 && (
              <p className="text-destructive text-sm">
                Missing required: {validation.missing.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Auth State */}
        <div>
          <h3 className="font-medium mb-2">Authentication State</h3>
          <div className="bg-muted p-3 rounded">
            {authState ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Has Session:</span>
                  <Badge variant={authState.hasSession ? "default" : "destructive"}>
                    {authState.hasSession ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {authState.user && (
                  <>
                    <div className="flex justify-between">
                      <span>User ID:</span>
                      <span className="font-mono text-xs">{authState.user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{authState.user.email}</span>
                    </div>
                  </>
                )}
                {authState.sessionError && (
                  <div className="text-destructive">
                    Error: {authState.sessionError.message}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Last checked: {authState.timestamp}
                </div>
              </div>
            ) : (
              <p className="text-sm">Click refresh to check auth state</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={copyDebugInfo} variant="outline" size="sm">
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Debug Info
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            Refresh Page
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-primary/5 p-3 rounded text-sm">
          <h4 className="font-medium mb-1">🔍 Debug Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Check if all required URL parameters are present</li>
            <li>Verify email verification was completed</li>
            <li>Look at browser console for detailed logs</li>
            <li>Copy debug info to share with support if needed</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
