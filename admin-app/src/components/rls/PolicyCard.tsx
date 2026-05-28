
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Shield, Eye, Edit, Plus, Trash } from 'lucide-react';
import type { EnhancedRLSPolicy } from '@/hooks/useEnhancedRLSManagement';

interface PolicyCardProps {
  policy: EnhancedRLSPolicy;
  onToggle: (policyName: string, tableName: string, enable: boolean) => void;
  disabled?: boolean;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onToggle, disabled }) => {
  const getPolicyTypeColor = (cmd: string) => {
    switch (cmd) {
      case 'SELECT': return 'bg-primary';
      case 'INSERT': return 'bg-green-500';
      case 'UPDATE': return 'bg-yellow-500';
      case 'DELETE': return 'bg-destructive';
      default: return 'bg-gray-500';
    }
  };

  const getPolicyTypeIcon = (cmd: string) => {
    switch (cmd) {
      case 'SELECT': return <Eye className="h-3 w-3" />;
      case 'INSERT': return <Plus className="h-3 w-3" />;
      case 'UPDATE': return <Edit className="h-3 w-3" />;
      case 'DELETE': return <Trash className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getAccessTypeColor = (policyType: string) => {
    switch (policyType) {
      case 'Personal Access': return 'bg-primary/10 text-primary';
      case 'Team Access': return 'bg-success/10 text-success';
      case 'Company Access': return 'bg-secondary text-secondary-foreground';
      case 'Admin Access': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-sm font-medium">{policy.policyname}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={`${getPolicyTypeColor(policy.cmd)} text-white flex items-center space-x-1`}>
                {getPolicyTypeIcon(policy.cmd)}
                <span>{policy.cmd}</span>
              </Badge>
              <Badge className={getAccessTypeColor(policy.policy_type)}>
                {policy.policy_type}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Policy Details</p>
                    <p className="text-xs">Table: {policy.tablename}</p>
                    <p className="text-xs">Permissive: {policy.permissive}</p>
                    {policy.roles && policy.roles.length > 0 && (
                      <p className="text-xs">Roles: {policy.roles.join(', ')}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Switch
              checked={policy.is_enabled}
              onCheckedChange={(checked) => onToggle(policy.policyname, policy.tablename, checked)}
              disabled={disabled}
            />
          </div>
        </div>
        
        <CardDescription className="text-sm">
          {policy.description}
        </CardDescription>
      </CardHeader>
      
      {(policy.qual || policy.with_check) && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {policy.qual && (
              <div>
                <p className="text-xs text-secondary-foreground mb-1">Condition:</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {policy.qual}
                </code>
              </div>
            )}
            
            {policy.with_check && (
              <div>
                <p className="text-xs text-secondary-foreground mb-1">With Check:</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {policy.with_check}
                </code>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PolicyCard;
