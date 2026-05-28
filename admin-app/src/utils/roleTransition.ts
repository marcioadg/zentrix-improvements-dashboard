// Utility to help transition from profile.role to company_members.permission_level

import { Profile } from '@/hooks/useProfile';
import { UIPermissionLevel } from '@/utils/permissionMapping';

// Mock role for components that still expect profile.role
export const getLegacyRoleForDisplay = (permissionLevel?: string): string => {
  if (!permissionLevel) return 'member';
  
  const roleMap: Record<string, string> = {
    'super_admin': 'super_admin',
    'director': 'owner', // Map director to owner for legacy display
    'manager': 'manager',
    'member': 'member',
    'view-only': 'view-only',
    'inactive': 'inactive'
  };
  
  return roleMap[permissionLevel] || 'member';
};

// Check if user has admin-level access (director or super admin)
export const hasAdminAccess = (permissionLevel?: string): boolean => {
  return ['super_admin', 'director'].includes(permissionLevel || '');
};

// Check if user has manager or above access
export const hasManagerOrAboveAccess = (permissionLevel?: string): boolean => {
  return ['super_admin', 'director', 'manager'].includes(permissionLevel || '');
};

// Get display name for permission level
export const getPermissionDisplayName = (permissionLevel?: string): string => {
  const displayMap: Record<string, string> = {
    'super_admin': 'Super Admin',
    'director': 'Director',
    'manager': 'Manager',
    'member': 'Member',
    'view-only': 'View-Only',
    'inactive': 'Inactive'
  };
  
  return displayMap[permissionLevel || ''] || 'Member';
};

// For components that need profile.role compatibility
export const getProfileWithRole = (profile: Profile | null, permissionLevel?: string): Profile | null => {
  if (!profile) return null;
  
  return {
    ...profile,
    role: getLegacyRoleForDisplay(permissionLevel)
  };
};