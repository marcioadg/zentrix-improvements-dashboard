import React from 'react';
import { AlertTriangle, Users, Shield, Wifi, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MeetingError, ErrorAction } from '@/services/meetingErrorHandler';

interface MeetingErrorDialogProps {
  open: boolean;
  onClose: () => void;
  error: MeetingError | null;
  actions: ErrorAction[];
  onActionClick: (action: ErrorAction) => void;
  loading?: boolean;
}

const getErrorIcon = (type: MeetingError['type']) => {
  switch (type) {
    case 'auth':
      return <Shield className="h-5 w-5 text-amber-500" />;
    case 'permission':
      return <Users className="h-5 w-5 text-destructive" />;
    case 'network':
      return <Wifi className="h-5 w-5 text-primary" />;
    default:
      return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getErrorTitle = (type: MeetingError['type']) => {
  switch (type) {
    case 'auth':
      return 'Authentication Required';
    case 'permission':
      return 'Access Denied';
    case 'network':
      return 'Connection Issue';
    default:
      return 'Meeting Error';
  }
};

const getButtonVariant = (actionType: ErrorAction['action']) => {
  switch (actionType) {
    case 'join_observer':
      return 'default';
    case 'retry':
      return 'default';
    case 'contact_admin':
      return 'outline';
    case 'navigate':
      return 'outline';
    default:
      return 'outline';
  }
};

const getButtonIcon = (actionType: ErrorAction['action']) => {
  switch (actionType) {
    case 'join_observer':
      return <Users className="h-4 w-4" />;
    case 'retry':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return null;
  }
};

export const MeetingErrorDialog: React.FC<MeetingErrorDialogProps> = ({
  open,
  onClose,
  error,
  actions,
  onActionClick,
  loading = false,
}) => {
  if (!error) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getErrorIcon(error.type)}
            {getErrorTitle(error.type)}
          </DialogTitle>
          <DialogDescription className="text-left">
            Unable to start the meeting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {error.message}
            </AlertDescription>
          </Alert>

          {error.canJoinAsObserver && (
            <Alert className="border-blue-200 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="ml-2 text-blue-800">
                You have director-level access and can join this meeting as an observer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              What would you like to do?
            </p>
            
            <div className="flex flex-col gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={getButtonVariant(action.action)}
                  size="sm"
                  onClick={() => onActionClick(action)}
                  disabled={loading}
                  className="justify-start"
                >
                  {getButtonIcon(action.action)}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {error.code && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Error Code: {error.code}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};