
import { useState } from 'react';
import { CompanyUser } from '@/types/companyUser';
import { Team } from '@/hooks/useTeamManagement';

export const useModalManager = () => {
  // People modals
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToEdit, setUserToEdit] = useState<CompanyUser | null>(null);
  const [deleteAction, setDeleteAction] = useState<'deactivate' | 'delete'>('deactivate');

  // Teams modals
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showEditTeam, setShowEditTeam] = useState(false);

  const openUserProfile = (user: CompanyUser) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const openEditName = (user: CompanyUser) => {
    setUserToEdit(user);
    setShowEditName(true);
  };

  const openDeactivateConfirm = (user: CompanyUser) => {
    setUserToEdit(user);
    setDeleteAction('deactivate');
    setShowDeleteConfirm(true);
  };

  const openDeleteConfirm = (user: CompanyUser) => {
    setUserToEdit(user);
    setDeleteAction('delete');
    setShowDeleteConfirm(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setShowEditTeam(true);
  };

  const closeAllModals = () => {
    setShowUserProfile(false);
    setShowAddMember(false);
    setShowEditName(false);
    setShowDeleteConfirm(false);
    setShowCreateTeam(false);
    setShowEditTeam(false);
    setSelectedUser(null);
    setUserToEdit(null);
    setEditingTeam(null);
  };

  return {
    // People modal states
    selectedUser,
    showUserProfile,
    showAddMember,
    showEditName,
    showDeleteConfirm,
    userToEdit,
    deleteAction,

    // Teams modal states
    showCreateTeam,
    editingTeam,
    showEditTeam,

    // Actions
    openUserProfile,
    openEditName,
    openDeactivateConfirm,
    openDeleteConfirm,
    openEditTeam,
    closeAllModals,

    // Setters for direct control
    setShowAddMember,
    setShowCreateTeam,
    setShowUserProfile,
    setShowEditName,
    setShowDeleteConfirm,
    setShowEditTeam
  };
};
