import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2, User } from 'lucide-react';
import { useOrgChartOptimized } from '@/hooks/useOrgChartOptimized';
import { getUserDisplayName } from '@/utils/userDisplayUtils';

interface UserSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  value,
  onValueChange,
  disabled = false
}) => {
  const { profiles, profilesLoading, fetchProfiles, fetchError } = useOrgChartOptimized();

  // Show error state if there's a fetch error
  if (fetchError && !profilesLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <div className="flex-1">
          <p className="text-sm text-destructive font-medium">Unable to load users</p>
          <p className="text-xs text-muted-foreground">
            {fetchError.includes('permission') 
              ? 'Permission denied - contact your administrator'
              : 'Please try refreshing'
            }
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchProfiles}
          disabled={profilesLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${profilesLoading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || profilesLoading}>
      <SelectTrigger>
        <SelectValue placeholder={profilesLoading ? "Loading users..." : "Select person (optional)"} />
      </SelectTrigger>
      <SelectContent className="max-h-60 overflow-y-auto">
        <SelectItem value="vacant">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Position vacant
          </div>
        </SelectItem>
        {profilesLoading ? (
          <SelectItem value="loading" disabled>
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading users...
            </div>
          </SelectItem>
        ) : !profiles || profiles.length === 0 ? (
          <SelectItem value="no-users" disabled>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              {fetchError 
                ? 'Error loading users'
                : 'No users available'
              }
            </div>
          </SelectItem>
        ) : (
          profiles.map(profile => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {getUserDisplayName(profile).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{getUserDisplayName(profile)}</span>
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};