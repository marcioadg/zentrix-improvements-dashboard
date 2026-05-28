import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Loader2, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CompanyMetrics, ComparisonTimeframe } from '@/hooks/useCompanyComparisonData';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getActiveUserIds } from '@/utils/analyticsUserFilter';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { logger } from '@/utils/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MetricDefinition {
  key: keyof CompanyMetrics;
  label: string;
  getLabel: (days: ComparisonTimeframe) => string;
  format: (value: number) => string;
  higherIsBetter: boolean;
  drillDownType: 'goals' | 'metrics' | 'meetings' | 'tasks' | 'issues' | 'tasks-created' | 'ratio' | 'resolution' | 'score' | 'tasks-per-person' | 'issues-per-person';
  weight?: number; // For overall score tooltip
  aggregation: 'total' | 'avg' | 'current'; // To clarify what this metric represents
}

// Score tooltip component
const ScoreTooltipContent: React.FC<{ company: CompanyMetrics }> = ({ company }) => {
  // Quality metrics (54%)
  const qualityMetrics = [
    { label: 'Goals On Track', weight: 15, contribution: (company.goalsOnTrackPercent / 100) * 10 * 0.15 },
    { label: 'Scorecards On Track', weight: 15, contribution: (company.metricsOnTrackPercent / 100) * 10 * 0.15 },
    { label: 'Avg Meeting Rating', weight: 12, contribution: company.avgMeetingRating * 0.12 },
    { label: 'Tasks On Time', weight: 12, contribution: (company.tasksOnTimePercent / 100) * 10 * 0.12 },
  ];
  
  // Efficiency metrics (11%) - normalized dynamically
  const efficiencyMetrics = [
    { label: 'Tasks/Issues Ratio', weight: 6, value: company.tasksToIssuesRatio },
    { label: 'Avg Resolution Time', weight: 5, value: company.avgResolutionTimeMinutes },
  ];
  
  // Activity metrics (35%) - normalized dynamically
  const activityMetrics = [
    { label: 'Tasks/Person (7d)', weight: 12, value: company.tasksPerPerson },
    { label: 'Issues/Person (7d)', weight: 8, value: company.issuesPerPerson },
    { label: 'Tasks Completed (7d)', weight: 6, value: company.tasksCompletedLast7Days },
    { label: 'Issues Resolved (7d)', weight: 5, value: company.issuesResolvedLast7Days },
    { label: 'Meetings Held (7d)', weight: 2, value: company.meetingsLast7Days },
    { label: 'Tasks Created/Meeting', weight: 2, value: company.tasksCreatedInMeetings },
  ];

  return (
    <div className="space-y-2 text-xs max-w-xs">
      <div className="font-semibold text-sm border-b pb-1 mb-2">Score Breakdown (12 Metrics)</div>
      
      <div className="space-y-1">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Quality (54%)</div>
        {qualityMetrics.map((item, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{item.label} ({item.weight}%)</span>
            <span className="font-medium">+{item.contribution.toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <div className="space-y-1 pt-1">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Efficiency (11%)</div>
        {efficiencyMetrics.map((item, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{item.label} ({item.weight}%)</span>
            <span className="font-medium">{item.value > 0 ? item.value.toFixed(1) : '-'}</span>
          </div>
        ))}
      </div>
      
      <div className="space-y-1 pt-1">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Activity (35%)</div>
        {activityMetrics.map((item, idx) => (
          <div key={idx} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{item.label} ({item.weight}%)</span>
            <span className="font-medium">{item.value > 0 ? (typeof item.value === 'number' && !Number.isInteger(item.value) ? item.value.toFixed(1) : item.value) : '-'}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
        <span>Total Score</span>
        <span>{company.overallScore.toFixed(1)} / 10</span>
      </div>
      <p className="text-muted-foreground text-[10px] mt-1 leading-relaxed">
        Efficiency &amp; Activity metrics are normalized against other companies.
      </p>
    </div>
  );
};

const getTimeframeLabel = (days: ComparisonTimeframe): string => {
  if (days === 7) return '7d';
  if (days === 30) return '30d';
  if (days === 90) return '90d';
  return '1y';
};

const metricDefinitions: MetricDefinition[] = [
  { 
    key: 'overallScore', 
    label: 'Overall Score', 
    getLabel: () => 'Overall Score',
    format: (v) => v.toFixed(1),
    higherIsBetter: true,
    drillDownType: 'score',
    aggregation: 'current',
  },
  { 
    key: 'goalsOnTrackPercent', 
    label: 'Goals On Track % (Current)', 
    getLabel: () => 'Goals On Track % (Current)',
    format: (v) => `${Math.round(v)}%`,
    higherIsBetter: true,
    drillDownType: 'goals',
    weight: 15,
    aggregation: 'current',
  },
  { 
    key: 'metricsOnTrackPercent', 
    label: 'Scorecards On Track % (Current)', 
    getLabel: () => 'Scorecards On Track % (Current)',
    format: (v) => `${Math.round(v)}%`,
    higherIsBetter: true,
    drillDownType: 'metrics',
    weight: 15,
    aggregation: 'current',
  },
  { 
    key: 'avgMeetingRating', 
    label: 'Avg Meeting Rating', 
    getLabel: (days) => `Avg Meeting Rating (${getTimeframeLabel(days)})`,
    format: (v) => v > 0 ? v.toFixed(1) : '-',
    higherIsBetter: true,
    drillDownType: 'meetings',
    weight: 12,
    aggregation: 'avg',
  },
  { 
    key: 'tasksCompletedLast7Days', 
    label: 'Total Tasks Completed', 
    getLabel: (days) => `Total Tasks Completed (${getTimeframeLabel(days)})`,
    format: (v) => v.toString(),
    higherIsBetter: true,
    drillDownType: 'tasks',
    weight: 6,
    aggregation: 'total',
  },
  { 
    key: 'tasksPerPerson', 
    label: 'Avg Tasks/Person', 
    getLabel: (days) => `Avg Tasks/Person (${getTimeframeLabel(days)})`,
    format: (v) => v > 0 ? v.toFixed(1) : '-',
    higherIsBetter: true,
    drillDownType: 'tasks-per-person',
    weight: 12,
    aggregation: 'avg',
  },
  { 
    key: 'issuesPerPerson', 
    label: 'Avg Issues/Person', 
    getLabel: (days) => `Avg Issues/Person (${getTimeframeLabel(days)})`,
    format: (v) => v > 0 ? v.toFixed(1) : '-',
    higherIsBetter: true,
    drillDownType: 'issues-per-person',
    weight: 8,
    aggregation: 'avg',
  },
  { 
    key: 'tasksOnTimePercent', 
    label: 'Tasks On Time %', 
    getLabel: (days) => `Tasks On Time % (${getTimeframeLabel(days)})`,
    format: (v) => `${Math.round(v)}%`,
    higherIsBetter: true,
    drillDownType: 'tasks',
    weight: 12,
    aggregation: 'avg',
  },
  { 
    key: 'issuesResolvedLast7Days', 
    label: 'Total Issues Resolved', 
    getLabel: (days) => `Total Issues Resolved (${getTimeframeLabel(days)})`,
    format: (v) => v.toString(),
    higherIsBetter: true,
    drillDownType: 'issues',
    weight: 5,
    aggregation: 'total',
  },
  { 
    key: 'tasksCreatedInMeetings', 
    label: 'Total Tasks Created in Meetings',
    getLabel: (days) => `Total Tasks/Meetings (${getTimeframeLabel(days)})`,
    format: (v) => v.toString(),
    higherIsBetter: true,
    drillDownType: 'tasks-created',
    weight: 2,
    aggregation: 'total',
  },
  { 
    key: 'tasksToIssuesRatio', 
    label: 'Avg Tasks/Issues Ratio', 
    getLabel: (days) => `Avg Tasks/Issues Ratio (${getTimeframeLabel(days)})`,
    format: (v) => v > 0 ? `${(v * 100).toFixed(0)}%` : '-',
    higherIsBetter: true,
    drillDownType: 'ratio',
    weight: 6,
    aggregation: 'avg',
  },
  { 
    key: 'avgResolutionTimeMinutes', 
    label: 'Avg Resolution Time', 
    getLabel: (days) => `Avg Resolution Time (${getTimeframeLabel(days)})`,
    format: (v) => v > 0 ? `${v.toFixed(1)} min` : '-',
    higherIsBetter: false,
    drillDownType: 'resolution',
    weight: 5,
    aggregation: 'avg',
  },
  { 
    key: 'meetingsLast7Days', 
    label: 'Total Meetings Held', 
    getLabel: (days) => `Total Meetings Held (${getTimeframeLabel(days)})`,
    format: (v) => v.toString(),
    higherIsBetter: true,
    drillDownType: 'meetings',
    weight: 2,
    aggregation: 'total',
  },
];

const getHeatmapColor = (normalizedValue: number, higherIsBetter: boolean): string => {
  const effectiveValue = higherIsBetter ? normalizedValue : 1 - normalizedValue;
  
  if (effectiveValue >= 0.8) return 'bg-emerald-500/30 text-emerald-700 dark:text-emerald-300';
  if (effectiveValue >= 0.6) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  if (effectiveValue >= 0.4) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
  if (effectiveValue >= 0.2) return 'bg-orange-500/25 text-orange-700 dark:text-orange-300';
  return 'bg-destructive/25 text-red-700 dark:text-red-300';
};

const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

interface DrillDownState {
  open: boolean;
  title: string;
  companyName: string;
  metricKey: string;
  data: any[];
  columns: { key: string; label: string }[];
  loading: boolean;
  description?: string;
}

interface CompanyComparisonHeatmapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CompanyMetrics[];
  loading: boolean;
  timeframe: ComparisonTimeframe;
  onTimeframeChange: (timeframe: ComparisonTimeframe) => void;
}

export const CompanyComparisonHeatmap: React.FC<CompanyComparisonHeatmapProps> = ({
  open,
  onOpenChange,
  data,
  loading,
  timeframe,
  onTimeframeChange,
}) => {
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    open: false,
    title: '',
    companyName: '',
    metricKey: '',
    data: [],
    columns: [],
    loading: false,
  });
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<keyof CompanyMetrics>('overallScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: keyof CompanyMetrics) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      // Default to desc for "higher is better" metrics, asc for "lower is better"
      const metric = metricDefinitions.find(m => m.key === key);
      setSortDirection(metric?.higherIsBetter === false ? 'asc' : 'desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] as number;
      const bVal = b[sortKey] as number;
      const diff = aVal - bVal;
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [data, sortKey, sortDirection]);

  const metricRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    
    metricDefinitions.forEach(metric => {
      const values = data.map(d => d[metric.key] as number).filter(v => v > 0 || metric.key.includes('Percent'));
      ranges[metric.key] = {
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 1,
      };
    });
    
    return ranges;
  }, [data]);

  const handleCellClick = async (company: CompanyMetrics, metric: MetricDefinition) => {
    setDrillDown({
      open: true,
      title: metric.label,
      companyName: company.companyName,
      metricKey: metric.key,
      data: [],
      columns: [],
      loading: true,
    });

    try {
      const activeUserIdsResult = await getActiveUserIds(company.companyId);
      const activeUserIds = Array.isArray(activeUserIdsResult) ? activeUserIdsResult : [...activeUserIdsResult];
      let drillDownData: any[] = [];
      let columns: { key: string; label: string }[] = [];

      const now = new Date();
      const startDate = new Date(now.getTime() - timeframe * 24 * 60 * 60 * 1000);

      switch (metric.drillDownType) {
        case 'goals': {
          // Get teams for this company first
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          
          const teamIds = teams?.map(t => t.id) || [];
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: goals } = await supabase
            .from('team_goals')
            .select('id, title, status, progress, updated_at, team_id, owner_id')
            .in('team_id', teamIds.length > 0 ? teamIds : ['no-match'])
            .or('archived.is.null,archived.eq.false');

          // Get owner profiles
          const ownerIds = [...new Set((goals || []).map(g => g.owner_id).filter(Boolean))];
          const { data: profiles } = ownerIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', ownerIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

          drillDownData = (goals || []).map(g => ({
            id: g.id,
            title: g.title,
            team: teamMap.get(g.team_id!) || 'No Team',
            status: g.status,
            progress: `${g.progress || 0}%`,
            owner: g.owner_id ? profileMap.get(g.owner_id) || 'Unknown' : 'Unassigned',
            updated: g.updated_at,
          }));
          columns = [
            { key: 'title', label: 'Goal' },
            { key: 'team', label: 'Team' },
            { key: 'status', label: 'Status' },
            { key: 'progress', label: 'Progress' },
            { key: 'owner', label: 'Owner' },
          ];
          break;
        }

        case 'metrics': {
          // Get teams for this company first
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          
          const teamIds = teams?.map(t => t.id) || [];
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: metrics } = await supabase
            .from('weekly_metrics')
            .select(`
              id, metric_name, metric_value, target_value, target_logic, updated_at, team_id, owner_id
            `)
            .in('team_id', teamIds.length > 0 ? teamIds : ['no-match'])
            .is('deleted_at', null);

          // Get owner profiles
          const ownerIds = [...new Set((metrics || []).map(m => m.owner_id).filter(Boolean))];
          const { data: profiles } = ownerIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', ownerIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

          drillDownData = (metrics || []).map(m => {
            let onTrack: boolean | null = null;
            if (m.metric_value !== null && m.target_value !== null) {
              const logic = m.target_logic || '>=';
              if (logic === '>=') onTrack = m.metric_value >= m.target_value;
              else if (logic === '<=') onTrack = m.metric_value <= m.target_value;
              else if (logic === '=') onTrack = m.metric_value === m.target_value;
              else onTrack = m.metric_value >= m.target_value;
            }
            return {
              id: m.id,
              name: m.metric_name,
              team: teamMap.get(m.team_id!) || 'No Team',
              current: m.metric_value ?? '-',
              target: m.target_value ?? '-',
              status: onTrack === null ? 'No Target' : onTrack ? 'On Track' : 'Off Track',
              owner: m.owner_id ? profileMap.get(m.owner_id) || 'Unknown' : 'Unassigned',
            };
          });
          columns = [
            { key: 'name', label: 'Metric' },
            { key: 'team', label: 'Team' },
            { key: 'current', label: 'Current' },
            { key: 'target', label: 'Target' },
            { key: 'status', label: 'Status' },
            { key: 'owner', label: 'Owner' },
          ];
          break;
        }

        case 'meetings': {
          // Get teams for this company
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: meetings } = await supabase
            .from('meeting_results')
            .select('id, created_at, meeting_ratings, issues_resolved, tasks_created, team_id')
            .eq('company_id', company.companyId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });

          drillDownData = (meetings || []).map(m => {
            // Calculate average rating from meeting_ratings
            const ratings = m.meeting_ratings as Record<string, number> | null;
            let avgRating: string | number = '-';
            if (ratings) {
              const values = Object.values(ratings).filter(v => typeof v === 'number' && v > 0);
              if (values.length > 0) {
                avgRating = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
              }
            }
            return {
              id: m.id,
              date: m.created_at,
              team: teamMap.get(m.team_id!) || 'No Team',
              rating: avgRating,
              issues: Array.isArray(m.issues_resolved) ? m.issues_resolved.length : 0,
              tasks: Array.isArray(m.tasks_created) ? m.tasks_created.length : 0,
            };
          });
          columns = [
            { key: 'date', label: 'Date' },
            { key: 'team', label: 'Team' },
            { key: 'rating', label: 'Rating' },
            { key: 'issues', label: 'Issues Resolved' },
            { key: 'tasks', label: 'Tasks Created' },
          ];
          break;
        }

        case 'tasks': {
          const { data: tasks } = await supabase
            .from('fast_tasks')
            .select('id, title, status, updated_at, team_name, assigned_to')
            .eq('company_id', company.companyId)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .gte('updated_at', startDate.toISOString())
            .order('updated_at', { ascending: false });

          // Fetch assignee names
          const assigneeIds = [...new Set((tasks || []).flatMap(t => t.assigned_to || []))];
          const { data: profiles } = assigneeIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

          drillDownData = (tasks || []).map(t => ({
            id: t.id,
            title: t.title,
            team: t.team_name || 'Personal',
            assignee: t.assigned_to?.[0] ? profileMap.get(t.assigned_to[0]) || 'Unknown' : 'Unassigned',
            completed: t.updated_at,
          }));
          columns = [
            { key: 'title', label: 'Task' },
            { key: 'team', label: 'Team' },
            { key: 'assignee', label: 'Assignee' },
            { key: 'completed', label: 'Completed' },
          ];
          break;
        }

        case 'tasks-per-person': {
          // Get active members for this company
          const { data: members } = await supabase
            .from('company_members')
            .select('user_id')
            .eq('company_id', company.companyId)
            .eq('status', 'active');
          
          const memberCount = members?.length || 0;

          // Get completed tasks
          const { data: tasks } = await supabase
            .from('fast_tasks')
            .select('id, title, status, updated_at, team_name, assigned_to')
            .eq('company_id', company.companyId)
            .eq('status', 'done')
            .eq('is_deleted', false)
            .gte('updated_at', startDate.toISOString())
            .order('updated_at', { ascending: false });

          // Fetch assignee names
          const assigneeIds = [...new Set((tasks || []).flatMap(t => t.assigned_to || []))];
          const { data: profiles } = assigneeIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
            : { data: [] };
          const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

          drillDownData = (tasks || []).map(t => ({
            id: t.id,
            title: t.title,
            team: t.team_name || 'Personal',
            assignee: t.assigned_to?.[0] ? profileMap.get(t.assigned_to[0]) || 'Unknown' : 'Unassigned',
            completed: t.updated_at,
          }));
          columns = [
            { key: 'title', label: 'Task' },
            { key: 'team', label: 'Team' },
            { key: 'assignee', label: 'Completed By' },
            { key: 'completed', label: 'Completed' },
          ];
          
          // Set description with member context
          setDrillDown(prev => ({
            ...prev,
            data: drillDownData,
            columns,
            loading: false,
            description: `Showing ${tasks?.length || 0} tasks completed by ${memberCount} active members`,
          }));
          return; // Early return since we're setting state directly
        }

        case 'issues-per-person': {
          // Get active members for this company
          const { data: members } = await supabase
            .from('company_members')
            .select('user_id')
            .eq('company_id', company.companyId)
            .eq('status', 'active');
          
          const memberCount = members?.length || 0;

          // Get teams for this company
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          // Get resolved issues from meetings
          const { data: meetings } = await supabase
            .from('meeting_results')
            .select('id, created_at, issues_resolved, team_id')
            .eq('company_id', company.companyId)
            .gte('created_at', startDate.toISOString())
            .not('issues_resolved', 'is', null);

          drillDownData = (meetings || []).flatMap(m => {
            const issues = m.issues_resolved as any[] | null;
            if (!issues || issues.length === 0) return [];
            return issues.map((issue, idx) => ({
              id: `${m.id}-${idx}`,
              issue: typeof issue === 'string' ? issue : issue?.title || issue?.name || 'Issue',
              team: teamMap.get(m.team_id!) || 'No Team',
              resolved: m.created_at,
            }));
          });
          columns = [
            { key: 'issue', label: 'Issue' },
            { key: 'team', label: 'Team' },
            { key: 'resolved', label: 'Resolved' },
          ];
          
          // Set description with member context
          setDrillDown(prev => ({
            ...prev,
            data: drillDownData,
            columns,
            loading: false,
            description: `Showing ${drillDownData.length} issues resolved by ${memberCount} active members`,
          }));
          return; // Early return since we're setting state directly
        }

        case 'issues': {
          // Get teams for this company
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: meetings } = await supabase
            .from('meeting_results')
            .select('id, created_at, issues_resolved, team_id')
            .eq('company_id', company.companyId)
            .gte('created_at', startDate.toISOString())
            .not('issues_resolved', 'is', null);

          drillDownData = (meetings || []).flatMap(m => {
            const issues = m.issues_resolved as any[] | null;
            if (!issues || issues.length === 0) return [];
            return issues.map((issue, idx) => ({
              id: `${m.id}-${idx}`,
              issue: typeof issue === 'string' ? issue : issue?.title || issue?.name || 'Issue',
              team: teamMap.get(m.team_id!) || 'No Team',
              resolved: m.created_at,
            }));
          });
          columns = [
            { key: 'issue', label: 'Issue' },
            { key: 'team', label: 'Team' },
            { key: 'resolved', label: 'Resolved' },
          ];
          break;
        }

        case 'tasks-created': {
          // Get teams for this company
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: meetings } = await supabase
            .from('meeting_results')
            .select('id, created_at, tasks_created, team_id')
            .eq('company_id', company.companyId)
            .gte('created_at', startDate.toISOString())
            .not('tasks_created', 'is', null);

          drillDownData = (meetings || []).flatMap(m => {
            const tasks = m.tasks_created as any[] | null;
            if (!tasks || tasks.length === 0) return [];
            return tasks.map((task, idx) => ({
              id: `${m.id}-${idx}`,
              task: typeof task === 'string' ? task : task?.title || task?.name || 'Task',
              team: teamMap.get(m.team_id!) || 'No Team',
              created: m.created_at,
            }));
          });
          columns = [
            { key: 'task', label: 'Task' },
            { key: 'team', label: 'Team' },
            { key: 'created', label: 'Created' },
          ];
          break;
        }

        case 'ratio':
        case 'resolution': {
          // Get teams for this company
          const { data: teams } = await supabase
            .from('teams')
            .select('id, name')
            .eq('company_id', company.companyId);
          const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

          const { data: meetings } = await supabase
            .from('meeting_results')
            .select('id, created_at, issues_resolved, tasks_created, total_duration_seconds, team_id')
            .eq('company_id', company.companyId)
            .gte('created_at', startDate.toISOString());

          drillDownData = (meetings || []).map(m => {
            const issueCount = Array.isArray(m.issues_resolved) ? m.issues_resolved.length : 0;
            const taskCount = Array.isArray(m.tasks_created) ? m.tasks_created.length : 0;
            const durationMinutes = m.total_duration_seconds ? m.total_duration_seconds / 60 : 0;
            const avgTime = issueCount > 0 && durationMinutes > 0
              ? (durationMinutes / issueCount).toFixed(1) 
              : '-';
            return {
              id: m.id,
              date: m.created_at,
              team: teamMap.get(m.team_id!) || 'No Team',
              issues: issueCount,
              tasks: taskCount,
              ratio: issueCount > 0 ? (taskCount / issueCount).toFixed(2) : '-',
              avgTime: avgTime,
              duration: durationMinutes > 0 ? `${durationMinutes.toFixed(0)} min` : '-',
            };
          });
          columns = [
            { key: 'date', label: 'Date' },
            { key: 'team', label: 'Team' },
            { key: 'issues', label: 'Issues' },
            { key: 'tasks', label: 'Tasks' },
            { key: 'ratio', label: 'Ratio' },
            { key: 'avgTime', label: 'Avg Time (min)' },
          ];
          break;
        }
      }

      setDrillDown(prev => ({
        ...prev,
        data: drillDownData,
        columns,
        loading: false,
      }));
    } catch (error) {
      logger.error('Error fetching drill-down data:', error);
      setDrillDown(prev => ({ ...prev, loading: false }));
    }
  };

  const closeDrillDown = () => {
    setDrillDown(prev => ({ ...prev, open: false, description: undefined }));
    setSearchText('');
  };

  const filteredDrillDownData = useMemo(() => {
    if (!searchText) return drillDown.data;
    const searchLower = searchText.toLowerCase();
    return drillDown.data.filter(row =>
      Object.values(row).some(value =>
        value !== null && value !== undefined && String(value).toLowerCase().includes(searchLower)
      )
    );
  }, [drillDown.data, searchText]);

  const renderCellValue = (value: any, key: string) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
    if (key.includes('date') || key === 'updated' || key === 'completed' || key === 'resolved') {
      try {
        return format(new Date(value), 'MMM d, yyyy');
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !max-w-none !w-full !h-full !translate-x-0 !translate-y-0 !left-0 !top-0 !rounded-none flex flex-col">
        <DialogHeader>
          {drillDown.open ? (
            <>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={closeDrillDown}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div>
                  <DialogTitle>{drillDown.companyName} - {drillDown.title}</DialogTitle>
                  <DialogDescription>
                    {drillDown.description || `Showing ${filteredDrillDownData.length} records`}
                  </DialogDescription>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between pr-12">
                <div>
                  <DialogTitle>Company Comparison</DialogTitle>
                  <DialogDescription>
                    Comparing key metrics across all companies. Click any cell to drill down.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Timeframe:</span>
                  <Select 
                    value={timeframe.toString()} 
                    onValueChange={(v) => onTimeframeChange(parseInt(v) as ComparisonTimeframe)}
                  >
                    <SelectTrigger className="w-[160px] pr-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last 1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogHeader>
        
        {drillDown.open ? (
          // Drill-down view
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 rounded-md border">
              {drillDown.loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDrillDownData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  {searchText ? 'No matching results' : 'No data available'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      {drillDown.columns.map(col => (
                        <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold border-b">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrillDownData.map((row, idx) => (
                      <tr key={row.id || idx} className="border-b hover:bg-muted/50 transition-colors duration-150">
                        {drillDown.columns.map(col => (
                          <td key={col.key} className="px-4 py-3 text-sm">
                            {renderCellValue(row[col.key], col.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </div>
        ) : loading ? (
          <div className="space-y-3 py-4 flex-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          // Main heatmap view
          <div className="overflow-auto flex-1">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold sticky left-0 bg-background z-10 min-w-[180px]">
                      Company
                    </TableHead>
                    {metricDefinitions.map(metric => (
                      <TableHead 
                        key={metric.key} 
                        className={`text-center font-semibold min-w-[140px] cursor-pointer hover:bg-muted/80 transition-colors ${metric.key === 'overallScore' ? 'bg-muted/50' : ''}`}
                        onClick={() => handleSort(metric.key)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="truncate">{metric.getLabel(timeframe)}</span>
                          {sortKey === metric.key ? (
                            sortDirection === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                          )}
                          {metric.key === 'overallScore' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px]">
                                <p className="text-xs">
                                  Weighted composite: Quality (54%), Efficiency (11%), Activity (35%)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map(company => (
                    <TableRow key={company.companyId}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {company.companyName}
                      </TableCell>
                      {metricDefinitions.map(metric => {
                        const range = metricRanges[metric.key];
                        const value = company[metric.key] as number;
                        const normalized = normalizeValue(value, range.min, range.max);
                        const colorClass = getHeatmapColor(normalized, metric.higherIsBetter);
                        
                        // Special handling for Overall Score with tooltip
                        if (metric.key === 'overallScore') {
                          return (
                            <TableCell 
                              key={metric.key}
                              className={`text-center font-bold transition-colors ${colorClass}`}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    {metric.format(value)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="w-[260px] p-3">
                                  <ScoreTooltipContent company={company} />
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        }
                        
                        return (
                          <TableCell 
                            key={metric.key}
                            className={`text-center font-medium transition-colors cursor-pointer hover:ring-2 hover:ring-primary/50 ${colorClass}`}
                            onClick={() => handleCellClick(company, metric)}
                          >
                            {metric.format(value)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        )}
        
        {!drillDown.open && (
          <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/30" />
              <span>Best</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/20" />
              <span>Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/25" />
              <span>Needs Attention</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
