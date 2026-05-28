import React, { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useComprehensiveActivityLogging } from '@/hooks/useComprehensiveActivityLogging';

interface AccessDeniedAlertProps {
  message?: string;
  targetType?: string;
  targetId?: string;
  showAlert?: boolean;
}

export const AccessDeniedAlert: React.FC<AccessDeniedAlertProps> = ({
  message = "Access denied - insufficient permissions",
  targetType,
  targetId,
  showAlert = true
}) => {
  const { logAccessDeniedAttempt } = useComprehensiveActivityLogging();

  useEffect(() => {
    // Log the access denied attempt
    logAccessDeniedAttempt(message, targetType, targetId, {
      timestamp: new Date().toISOString(),
      attempted_resource: targetType,
      resource_id: targetId
    });
  }, [message, targetType, targetId, logAccessDeniedAttempt]);

  if (!showAlert) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};