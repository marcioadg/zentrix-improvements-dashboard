
import React from 'react';
import { BaseModal } from './BaseModal';
import { AlertTriangle } from 'lucide-react';
import { Team } from '@/hooks/useTeamManagement';

interface DeleteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onConfirm: () => void;
}

export const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({
  open,
  onOpenChange,
  team,
  onConfirm,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Team"
      description={`Are you sure you want to delete "${team?.name}"? This will permanently remove the team and all related data.`}
      onSubmit={handleConfirm}
      onCancel={() => onOpenChange(false)}
      submitText="Delete Team and Related Data"
      cancelText="Cancel"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-800">This action cannot be undone</p>
            <p className="text-red-700 mt-1">
              Deleting this team will also remove its meetings, headlines, issues and votes, metrics, tasks, clarity breaks, team goals (and milestones), and memberships.
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
