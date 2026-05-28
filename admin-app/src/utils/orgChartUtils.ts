
import { useMemo } from 'react';

export const useOrgChartUtils = (roles: any[], searchTerm: string) => {
  // Memoized filtered roles for better performance
  const filteredRoles = useMemo(() => 
    roles.filter(role => 
      role.title.toLowerCase().includes(searchTerm.toLowerCase())
    ), [roles, searchTerm]
  );

  // Memoized root roles
  const rootRoles = useMemo(() => 
    filteredRoles.filter(role => !role.reports_to_role_id), 
    [filteredRoles]
  );

  // Memoized function to get sorted siblings
  const getSortedSiblings = (siblings: any[]) => {
    return [...siblings].sort((a, b) => {
      // Sort by position_x first, treating null/undefined as 0
      const aPos = a.position_x ?? 0;
      const bPos = b.position_x ?? 0;
      
      if (aPos !== bPos) {
        return aPos - bPos;
      }
      
      // If position_x is the same, prioritize meaningful roles over test roles
      const aIsTest = a.title.toLowerCase().includes('test');
      const bIsTest = b.title.toLowerCase().includes('test');
      
      if (aIsTest && !bIsTest) return 1;  // b comes first
      if (!aIsTest && bIsTest) return -1; // a comes first
      
      // If both are test or both are real roles, sort by title as fallback
      return a.title.localeCompare(b.title);
    });
  };

  return {
    filteredRoles,
    rootRoles,
    getSortedSiblings
  };
};

export const shouldRenderHorizontally = (children: any[]) => {
  return children.length > 0; // Always horizontal when there are children
};
