
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar } from 'lucide-react';

interface CompanyStats {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  teamCount: number;
  createdAt: string;
}

interface CompanyStatsViewProps {
  companies: CompanyStats[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const CompanyStatsView: React.FC<CompanyStatsViewProps> = ({
  companies,
  loading,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-6 bg-muted rounded w-1/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        This view has been replaced with the enhanced Company Management interface above.
        Use the "Companies" tab for the full management experience.
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{company.userCount} users</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Created {new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {companies.length === 0 && !loading && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No companies found</h3>
          <p className="text-muted-foreground">
            Companies will appear here once they are created.
          </p>
        </div>
      )}
    </div>
  );
};
