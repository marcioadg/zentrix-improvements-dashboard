import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Search, AlertTriangle } from 'lucide-react';
import { useSimplifiedRLSManagement } from '@/hooks/useSimplifiedRLSManagement';
import { SecurityDashboard } from '@/components/rls/SecurityDashboard';
import { RLSTableSection } from '@/components/rls/RLSTableSection';
import { RLSPolicySection } from '@/components/rls/RLSPolicySection';

const OptimizedRLSManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const {
    policies,
    tableStatuses,
    statistics,
    loading,
    error,
    isConnected,
    toggleTableRLS,
    refreshAll,
  } = useSimplifiedRLSManagement();

  const tableCategories = {
    core: ['profiles', 'companies', 'teams', 'team_members', 'company_members'],
    tasks: ['fast_tasks'],
    meetings: ['meetings', 'issues', 'headlines', 'meeting_results', 'issue_votes', 'issue_ratings'],
    ai: ['ai_chat_sessions', 'ai_user_preferences', 'ai_conversation_context', 'ai_business_context_cache'],
    support: ['attachments', 'invitations', 'user_settings', 'weekly_metrics', 'active_weekly_metrics']
  };

  const filteredTables = tableStatuses.filter(table => {
    const matchesSearch = table.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      tableCategories[selectedCategory as keyof typeof tableCategories]?.includes(table.table_name);
    return matchesSearch && matchesCategory;
  });

  const filteredPolicies = policies.filter(policy => 
    policy.tablename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.policyname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading RLS configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Error Loading RLS Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={refreshAll}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Row Level Security Management
              </h1>
              <p className="text-muted-foreground">
                Manage database table security and access policies
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables or policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              all: 'All Tables',
              core: 'Core Tables',
              tasks: 'Tasks & Goals',
              meetings: 'Meetings',
              ai: 'AI Features',
              support: 'Supporting'
            }).map(([key, label]) => (
              <Badge
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(key)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Security Dashboard */}
        <SecurityDashboard statistics={statistics} tableStatuses={tableStatuses} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="tables" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables">Tables ({tableStatuses.length})</TabsTrigger>
            <TabsTrigger value="policies">Policies ({policies.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tables" className="mt-6">
            <RLSTableSection
              tables={filteredTables}
              onToggleRLS={toggleTableRLS}
              tableCategories={tableCategories}
              selectedCategory={selectedCategory}
            />
          </TabsContent>
          
          <TabsContent value="policies" className="mt-6">
            <RLSPolicySection policies={filteredPolicies} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OptimizedRLSManagement;