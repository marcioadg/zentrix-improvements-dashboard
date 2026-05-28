import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, Edit, Trash, Shield, Lock, Users, User } from 'lucide-react';
import type { BasicRLSPolicy as RLSPolicy } from '@/services/rlsService';

interface RLSPolicySectionProps {
  policies: RLSPolicy[];
}

export const RLSPolicySection = ({ policies }: RLSPolicySectionProps) => {
  const getPolicyIcon = (cmd: string) => {
    switch (cmd.toUpperCase()) {
      case 'SELECT':
        return <Eye className="h-4 w-4 text-primary" />;
      case 'INSERT':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-yellow-500" />;
      case 'DELETE':
        return <Trash className="h-4 w-4 text-destructive" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPolicyTypeBadge = (cmd: string) => {
    const colors = {
      SELECT: 'bg-primary/10 text-blue-800 border-blue-200',
      INSERT: 'bg-success/10 text-green-800 border-green-200',
      UPDATE: 'bg-warning/10 text-yellow-800 border-yellow-200',
      DELETE: 'bg-destructive/10 text-red-800 border-red-200',
    };
    
    const color = colors[cmd.toUpperCase() as keyof typeof colors] || 'bg-muted text-gray-800 border-border';
    
    return (
      <Badge className={color}>
        {cmd.toUpperCase()}
      </Badge>
    );
  };

  const getAccessTypeBadge = (policyName: string) => {
    const name = policyName.toLowerCase();
    
    if (name.includes('own') || name.includes('user') || name.includes('personal')) {
      return (
        <Badge className="bg-secondary text-purple-800 border-purple-200">
          <User className="h-3 w-3 mr-1" />
          Personal
        </Badge>
      );
    }
    
    if (name.includes('team') || name.includes('member')) {
      return (
        <Badge className="bg-warning/10 text-orange-800 border-orange-200">
          <Users className="h-3 w-3 mr-1" />
          Team
        </Badge>
      );
    }
    
    if (name.includes('company') || name.includes('current_company')) {
      return (
        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
          <Lock className="h-3 w-3 mr-1" />
          Company
        </Badge>
      );
    }
    
    if (name.includes('admin') || name.includes('super')) {
      return (
        <Badge className="bg-destructive/10 text-red-800 border-red-200">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        General
      </Badge>
    );
  };

  // Group policies by table
  const groupedPolicies = policies.reduce((acc, policy) => {
    if (!acc[policy.tablename]) acc[policy.tablename] = [];
    acc[policy.tablename].push(policy);
    return acc;
  }, {} as Record<string, RLSPolicy[]>);

  const formatCondition = (condition: string | null) => {
    if (!condition || condition === 'true') return 'Always allow';
    if (condition.includes('auth.uid()')) return 'User-based access';
    if (condition.includes('company_id')) return 'Company scoped';
    if (condition.includes('team_id')) return 'Team scoped';
    return condition.length > 50 ? condition.substring(0, 50) + '...' : condition;
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedPolicies).map(([tableName, tablePolicies]) => (
        <Card key={tableName}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Table: {tableName}</span>
              </div>
              <Badge variant="outline">{tablePolicies.length} policies</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {tablePolicies.map((policy, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getPolicyIcon(policy.cmd)}
                      <div>
                        <h4 className="font-medium text-sm">{policy.policyname}</h4>
                        <p className="text-xs text-muted-foreground">
                          {policy.permissive === 'PERMISSIVE' ? 'Permissive' : 'Restrictive'} policy
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getPolicyTypeBadge(policy.cmd)}
                      {getAccessTypeBadge(policy.policyname)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Roles:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {policy.roles.map((role, roleIndex) => (
                          <Badge key={roleIndex} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Condition:</span>
                      <p className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                        {formatCondition(policy.qual)}
                      </p>
                    </div>
                  </div>
                  
                  {policy.with_check && (
                    <div className="mt-3 text-sm">
                      <span className="text-muted-foreground">Check Constraint:</span>
                      <p className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                        {formatCondition(policy.with_check)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {Object.keys(groupedPolicies).length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No policies found</h3>
            <p className="text-muted-foreground">
              No RLS policies match your current search criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};