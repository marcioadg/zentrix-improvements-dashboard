
import React from 'react';
import { CreateTeamModal } from '@/components/modals/CreateTeamModal';
import { EditTeamModal } from '@/components/modals/EditTeamModal';
import { DeleteTeamModal } from '@/components/modals/DeleteTeamModal';
import { Team } from '@/hooks/useTeamManagement';

interface TeamsModalsProps {
  // Modal states
  showCreateTeam: boolean;
  showEditTeam: boolean;
  showDeleteTeam: boolean;
  editingTeam: Team | null;
  deletingTeam: Team | null;

  // Modal handlers
  onCreateTeamChange: (open: boolean) => void;
  onEditTeamChange: (open: boolean) => void;
  onDeleteTeamChange: (open: boolean) => void;

  // Actions
  onCreateTeam: (name: string, memberIds?: string[], isLeadership?: boolean) => Promise<void>;
  onUpdateTeam: (teamId: string, updates: { name?: string; is_leadership?: boolean }) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
}

export const TeamsModals: React.FC<TeamsModalsProps> = ({
  showCreateTeam,
  showEditTeam,
  showDeleteTeam,
  editingTeam,
  deletingTeam,
  onCreateTeamChange,
  onEditTeamChange,
  onDeleteTeamChange,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam
}) => {
  const handleCreateTeam = async (name: string, memberIds?: string[], isLeadership?: boolean) => {
    try {
      await onCreateTeam(name, memberIds, isLeadership);
      // Close modal immediately after successful creation for immediate UI update
      onCreateTeamChange(false);
    } catch (error) {
      // Don't close modal on error, let the parent handle error display
      throw error;
    }
  };

  const handleUpdateTeam = async (teamId: string, updates: { name?: string; is_leadership?: boolean }) => {
    try {
      await onUpdateTeam(teamId, updates);
      // Close modal immediately after successful update for immediate UI update
      onEditTeamChange(false);
    } catch (error) {
      // Don't close modal on error, let the parent handle error display
      throw error;
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    
    try {
      await onDeleteTeam(deletingTeam.id);
      // Close modal immediately after successful deletion for immediate UI update
      onDeleteTeamChange(false);
    } catch (error) {
      // Don't close modal on error, let the parent handle error display
      throw error;
    }
  };

  return (
    <>
      <CreateTeamModal
        open={showCreateTeam}
        onOpenChange={onCreateTeamChange}
        onCreateTeam={handleCreateTeam}
      />

      <EditTeamModal
        open={showEditTeam}
        onOpenChange={onEditTeamChange}
        team={editingTeam}
        onUpdateTeam={handleUpdateTeam}
      />

      <DeleteTeamModal
        open={showDeleteTeam}
        onOpenChange={onDeleteTeamChange}
        team={deletingTeam}
        onConfirm={handleDeleteTeam}
      />
    </>
  );
};
