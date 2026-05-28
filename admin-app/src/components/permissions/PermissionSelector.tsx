
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERMISSION_OPTIONS } from '@/utils/permissionMapping';

interface PermissionSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  type: 'role' | 'permission_level';
  disabled?: boolean;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  value,
  onValueChange,
  type,
  disabled = false
}) => {
  // Use standard permission options for both role and permission_level types
  // This ensures consistency across the application
  const options = PERMISSION_OPTIONS;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PermissionSelector;
