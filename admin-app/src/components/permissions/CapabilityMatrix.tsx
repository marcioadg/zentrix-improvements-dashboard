
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { CAPABILITY_DEFINITIONS, CAPABILITY_CATEGORIES, type CapabilityDefinition } from '@/utils/capabilityDefinitions';

interface CapabilityMatrixProps {
  title: string;
  description: string;
  roles: string[];
  roleCapabilities: Record<string, string[]>;
  roleColors?: Record<string, string>;
}

const CapabilityMatrix: React.FC<CapabilityMatrixProps> = ({
  title,
  description,
  roles,
  roleCapabilities,
  roleColors = {}
}) => {
  const getCapabilityByKey = (key: string): CapabilityDefinition | undefined => {
    return CAPABILITY_DEFINITIONS.find(cap => cap.key === key);
  };

  const getCapabilitiesByCategory = (category: string): CapabilityDefinition[] => {
    return CAPABILITY_DEFINITIONS.filter(cap => cap.category === category);
  };

  const hasCapability = (role: string, capabilityKey: string): boolean => {
    return roleCapabilities[role]?.includes(capabilityKey) || false;
  };

  const getRoleBadgeColor = (role: string): string => {
    return roleColors[role] || 'bg-muted text-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {CAPABILITY_CATEGORIES.map((category) => {
            const categoryCapabilities = getCapabilitiesByCategory(category);
            if (categoryCapabilities.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <h4 className="font-semibold text-lg text-foreground border-b pb-2">
                  {category}
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground min-w-[200px]">
                          Capability
                        </th>
                        {roles.map((role) => (
                          <th key={role} className="text-center py-3 px-4 min-w-[120px]">
                            <Badge className={getRoleBadgeColor(role)}>
                              {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                            </Badge>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCapabilities.map((capability) => (
                        <tr key={capability.key} className="border-b hover:bg-muted/50 transition-colors duration-150">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-foreground">
                                {capability.label}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {capability.description}
                              </div>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={`${role}-${capability.key}`} className="py-3 px-4 text-center">
                              {hasCapability(role, capability.key) ? (
                                <div className="inline-flex items-center justify-center w-8 h-8 bg-success/15 rounded-full">
                                  <Check className="h-5 w-5 text-success" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-8 h-8 bg-destructive/15 rounded-full">
                                  <X className="h-5 w-5 text-destructive" />
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CapabilityMatrix;
