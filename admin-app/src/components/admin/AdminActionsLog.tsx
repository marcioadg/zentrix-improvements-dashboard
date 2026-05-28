
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminAction } from '@/types/superAdmin';
import { format } from 'date-fns';
import { Shield, AlertTriangle, Settings, Users, Building2, X } from 'lucide-react';

interface AdminActionsLogProps {
  adminActions: AdminAction[];
  loading: boolean;
}

export const AdminActionsLog: React.FC<AdminActionsLogProps> = ({ adminActions, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionTypeBadge = (actionType: string, success?: boolean) => {
    const colors: { [key: string]: "default" | "secondary" | "destructive" } = {
      test_execution: 'default',
      user_management: 'secondary', 
      company_management: 'secondary',
      system_config: 'destructive',
      access_denied: 'destructive',
      authentication: 'default',
      permission_change: 'secondary'
    };
    
    const variant = success === false ? 'destructive' : (colors[actionType] || 'secondary');
    const icon = success === false ? <X className="h-3 w-3 mr-1" /> : getActionIcon(actionType);
    
    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'user_management':
        return <Users className="h-3 w-3 mr-1" />;
      case 'company_management':
        return <Building2 className="h-3 w-3 mr-1" />;
      case 'system_config':
        return <Settings className="h-3 w-3 mr-1" />;
      case 'access_denied':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      default:
        return <Shield className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Activity Log</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete log of all system actions including successful operations, failed attempts, and access denials.
        </p>
      </CardHeader>
      <CardContent>
        {adminActions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No admin actions recorded yet.
          </p>
        ) : (
          <div className="md:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Time (Local)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminActions.map((action) => (
                  <TableRow key={action.id} className={action.success === false ? 'bg-destructive/10' : ''}>
                    <TableCell>
                      {getActionTypeBadge(action.action_type, action.success)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {action.admin_user_name}
                        </div>
                        {action.affected_user_name && (
                          <div className="text-xs text-muted-foreground">
                            Affected: {action.affected_user_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {action.company_name ? (
                        <span className="text-sm font-medium">{action.company_name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {action.target_type ? (
                        <div className="space-y-1">
                          <span className="text-sm font-medium">{action.target_type}</span>
                          {action.target_id && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {action.target_id.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={action.description}>
                        {action.description}
                      </div>
                      {action.user_ip_address && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          IP: {action.user_ip_address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <div>{format(new Date(action.created_at), 'MMM d, yyyy')}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(action.created_at), 'h:mm:ss a')}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
