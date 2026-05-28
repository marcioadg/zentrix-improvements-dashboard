import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface TemplateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  onConfirm: (mode: 'replace' | 'append') => void;
  hasExistingRoles: boolean;
}

export const TemplateConfirmDialog: React.FC<TemplateConfirmDialogProps> = ({
  open,
  onOpenChange,
  templateName,
  onConfirm,
  hasExistingRoles,
}) => {
  const [selectedMode, setSelectedMode] = React.useState<'replace' | 'append'>('append');

  const handleConfirm = () => {
    onConfirm(selectedMode);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Load Template: {templateName}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>How would you like to load this template?</p>

              {hasExistingRoles && (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="mode"
                      value="append"
                      checked={selectedMode === 'append'}
                      onChange={() => setSelectedMode('append')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-foreground">Add to existing structure</div>
                      <div className="text-sm text-muted-foreground">
                        Keep your current roles and add the template roles
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-destructive/10 transition-colors border-destructive/50">
                    <input
                      type="radio"
                      name="mode"
                      value="replace"
                      checked={selectedMode === 'replace'}
                      onChange={() => setSelectedMode('replace')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">Replace all existing roles</div>
                      <div className="text-sm text-muted-foreground">
                        Delete all current roles and load the template
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>This action cannot be undone</span>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {!hasExistingRoles && (
                <p className="text-sm text-muted-foreground">
                  This template will be loaded into your empty org chart.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={selectedMode === 'replace' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {selectedMode === 'replace' ? 'Replace All Roles' : 'Add Template Roles'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
