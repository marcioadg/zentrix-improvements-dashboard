
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Users, Eye, UserCheck, UserX } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
  className?: string;
}

const getPermissionIcon = (level: string) => {
  switch (level) {
    case 'super_admin':
      return <Crown className="w-4 h-4" />;
    case 'director':
      return <Shield className="w-4 h-4" />;
    case 'manager':
      return <Users className="w-4 h-4" />;
    case 'view-only':
      return <Eye className="w-4 h-4" />;
    case 'inactive':
      return <UserX className="w-4 h-4" />;
    default:
      return <UserCheck className="w-4 h-4" />;
  }
};

const getPermissionColor = (level: string) => {
  switch (level) {
    case 'super_admin':
      return 'bg-[var(--active)]/20 text-foreground border-[var(--active)]/30';
    case 'director':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'manager':
      return 'bg-[var(--active)]/10 text-foreground border-[var(--active)]/20';
    case 'view-only':
      return 'bg-muted text-muted-foreground border-border';
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border';
    default: // member
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getPermissionLabel = (level: string) => {
  switch (level) {
    case 'view-only':
      return 'View-Only';
    case 'member':
      return 'Member';
    case 'manager':
      return 'Manager';
    case 'director':
      return 'Director';
    case 'super_admin':
      return 'Super Admin';
    case 'inactive':
      return 'Deactivated';
    default:
      return level;
  }
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleChange,
  disabled = false,
  className = "w-40"
}) => {
  const permissionLevels = [
    { value: 'view-only', label: 'View-Only' },
    { value: 'member', label: 'Member' },
    { value: 'manager', label: 'Manager' },
    { value: 'director', label: 'Director' }
  ];

  return (
    <Select value={selectedRole} onValueChange={onRoleChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue>
          <Badge className={`${getPermissionColor(selectedRole)} text-xs border-none`}>
            <div className="flex items-center space-x-1">
              {getPermissionIcon(selectedRole)}
              <span>{getPermissionLabel(selectedRole)}</span>
            </div>
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {permissionLevels.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            <div className="flex items-center space-x-2">
              {getPermissionIcon(level.value)}
              <span>{level.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
