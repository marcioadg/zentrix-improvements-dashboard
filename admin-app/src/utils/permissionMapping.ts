
// Mapping utilities for permission levels - SIMPLIFIED to use only permission_level

export type UIPermissionLevel = 'view-only' | 'member' | 'manager' | 'director' | 'super_admin' | 'inactive';

// Standard permission options for UI components
export const PERMISSION_OPTIONS = [
  { value: 'view-only', label: 'View Only' },
  { value: 'member', label: 'Member' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' }
] as const;

// Map database permission levels to UI permission levels
export const mapDBRoleToUIPermission = (dbRole: string): UIPermissionLevel => {
  const roleMap: Record<string, UIPermissionLevel> = {
    'view-only': 'view-only',
    'member': 'member',
    'manager': 'manager',
    'director': 'director',
    'super_admin': 'super_admin',
    'inactive': 'inactive',
    // Legacy mappings - map admin/owner to director level
    'admin': 'director',
    'owner': 'director',
    // Fallback mappings for any other legacy roles
    'viewer': 'view-only',
    'user': 'member'
  };
  
  return roleMap[dbRole] || 'member';
};

// Check if a permission level change is valid
export const isValidPermissionChange = (from: UIPermissionLevel, to: UIPermissionLevel): boolean => {
  // For now, allow all changes - can add business logic here later
  return true;
};

// Get permission level display name
export const getPermissionDisplayName = (permissionLevel: UIPermissionLevel): string => {
  const displayNames: Record<UIPermissionLevel, string> = {
    'view-only': 'View-Only',
    'member': 'Member',
    'manager': 'Manager',
    'director': 'Director',
    'super_admin': 'Super Admin',
    'inactive': 'Inactive'
  };
  
  return displayNames[permissionLevel] || permissionLevel;
};

// Check if permission level has manager-level access
export const hasManagerAccess = (permissionLevel: UIPermissionLevel): boolean => {
  return ['manager', 'director', 'super_admin'].includes(permissionLevel);
};

// Check if permission level has director-level access (was admin/owner level)
export const hasDirectorAccess = (permissionLevel: UIPermissionLevel): boolean => {
  return ['director', 'super_admin'].includes(permissionLevel);
};
