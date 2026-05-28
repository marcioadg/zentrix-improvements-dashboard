
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Users, Building } from 'lucide-react';
import { CompanyWithStats } from '@/hooks/useCompanyManagement';

interface CompanyDeletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  company: CompanyWithStats | null;
}

export const CompanyDeletionModal: React.FC<CompanyDeletionModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  company
}) => {
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
    setConfirmationText('');
  };

  const isConfirmationValid = confirmationText === company?.name;

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Company: {company.name}
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete the company and ALL associated data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Critical Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-red-200 rounded-md">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800 mb-2">⚠️ COMPLETE DATA DELETION</p>
              <p className="text-red-700 mb-2">
                This will permanently delete:
              </p>
              <ul className="text-red-700 text-xs space-y-1 ml-4">
                <li>• All {company.user_count} users and their personal data</li>
                <li>• All {company.team_count} teams and team data</li>
                <li>• All tasks, goals, metrics, and issues</li>
                <li>• All meeting data and history</li>
                <li>• All strategic plans and documents</li>
              </ul>
            </div>
          </div>

          {/* Company Stats Summary */}
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium mb-3">Company Overview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Users: <span className="font-medium">{company.user_count}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>Teams: <span className="font-medium">{company.team_count}</span></span>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                Created: {new Date(company.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              To confirm deletion, type the company name: <span className="font-bold text-destructive">{company.name}</span>
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${company.name}" to confirm`}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmationValid}
          >
            Delete Company & All Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
