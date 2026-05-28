import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  UserPlus, 
  UserMinus, 
  Plus, 
  Minus, 
  Edit, 
  ArrowUp, 
  Palette,
  History,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface RoleActivity {
  id: string;
  activity_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  changer_name?: string;
}

interface RoleActivitySectionProps {
  roleId: string;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  person_assigned: UserPlus,
  person_removed: UserMinus,
  responsibility_added: Plus,
  responsibility_removed: Minus,
  title_changed: Edit,
  reports_to_changed: ArrowUp,
  color_changed: Palette,
  role_created: Plus,
};

const activityColors: Record<string, string> = {
  person_assigned: 'text-status-success',
  person_removed: 'text-status-error',
  responsibility_added: 'text-status-info',
  responsibility_removed: 'text-status-warning',
  title_changed: 'text-primary',
  reports_to_changed: 'text-status-info',
  color_changed: 'text-primary',
  role_created: 'text-status-success',
};

export const RoleActivitySection: React.FC<RoleActivitySectionProps> = ({ roleId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: activities, isLoading } = useQuery({
    queryKey: ['role-activities', roleId],
    queryFn: async () => {
      // Fetch activities with changer profile info
      const { data, error } = await supabase
        .from('org_role_activity')
        .select(`
          id,
          activity_type,
          description,
          old_value,
          new_value,
          changed_by,
          created_at
        `)
        .eq('role_id', roleId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profile names for changers
      const changerIds = [...new Set(data?.map(a => a.changed_by).filter(Boolean) || [])];
      let changerNames: Record<string, string> = {};
      
      if (changerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', changerIds);
        
        if (profiles) {
          changerNames = Object.fromEntries(
            profiles.map(p => [p.id, p.full_name || 'Unknown'])
          );
        }
      }

      return (data || []).map(activity => ({
        ...activity,
        changer_name: activity.changed_by ? changerNames[activity.changed_by] : undefined
      })) as RoleActivity[];
    },
    enabled: isOpen, // Only fetch when section is expanded
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Activities</span>
            {activities && activities.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {activities.length}
              </span>
            )}
          </div>
          <ChevronRight 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90"
            )} 
          />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-1 mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading activities...</span>
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type] || Edit;
              const colorClass = activityColors[activity.activity_type] || 'text-muted-foreground';
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("mt-0.5 flex-shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-tight">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      {activity.changer_name && (
                        <span> by {activity.changer_name}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No activity recorded yet
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
