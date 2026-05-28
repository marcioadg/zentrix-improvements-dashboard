import { useQuery } from '@tanstack/react-query';
import { fetchCompanyProductivityData, CompanyProductivityData } from '@/services/analytics2Service';

export function useCompanyProductivity() {
  return useQuery({
    queryKey: ['company-productivity'],
    queryFn: fetchCompanyProductivityData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export type SortField = 
  | 'company_name' 
  | 'productivity_score' 
  | 'task_completion_rate' 
  | 'issue_resolution_rate' 
  | 'member_count' 
  | 'meetings_count';

export type SortDirection = 'asc' | 'desc';

export function sortCompanies(
  companies: CompanyProductivityData[],
  field: SortField,
  direction: SortDirection
): CompanyProductivityData[] {
  return [...companies].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    const diff = (aVal as number) - (bVal as number);
    return direction === 'asc' ? diff : -diff;
  });
}

export function filterCompanies(
  companies: CompanyProductivityData[],
  searchTerm: string,
  minMembers: number,
  engagementLevel: 'all' | 'high' | 'medium' | 'low'
): CompanyProductivityData[] {
  return companies.filter(company => {
    const matchesSearch = company.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMinMembers = company.member_count >= minMembers;
    const matchesEngagement = engagementLevel === 'all' || company.engagement_level === engagementLevel;
    
    return matchesSearch && matchesMinMembers && matchesEngagement;
  });
}
