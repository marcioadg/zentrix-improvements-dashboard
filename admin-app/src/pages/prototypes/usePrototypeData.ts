// Shared mock data for prototype pages — WiseVAs company data
// All hooks return hardcoded realistic data (no Supabase dependency)

import { useState, useEffect } from 'react';

const WISEVA_COMPANY_ID = 'e8eb94f1-0219-4e71-9ab2-643643e017e0';

// ─── Teams ──────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  company_id: string;
  is_leadership: boolean;
  description: string | null;
}

const MOCK_TEAMS: Team[] = [
  { id: 't-daily-ops', name: 'Daily - Operations', company_id: WISEVA_COMPANY_ID, is_leadership: false, description: 'Daily operations standups' },
  { id: 't-growth', name: 'Growth Squad', company_id: WISEVA_COMPANY_ID, is_leadership: false, description: 'Cross-functional growth team' },
  { id: 't-leadership', name: 'Leadership', company_id: WISEVA_COMPANY_ID, is_leadership: true, description: 'Executive leadership team' },
  { id: 't-marketing', name: 'Marketing', company_id: WISEVA_COMPANY_ID, is_leadership: false, description: 'Marketing and brand' },
  { id: 't-operations', name: 'Operations', company_id: WISEVA_COMPANY_ID, is_leadership: false, description: 'VA operations and delivery' },
  { id: 't-sales', name: 'Sales', company_id: WISEVA_COMPANY_ID, is_leadership: false, description: 'Sales and business development' },
];

export function useTeams() {
  const [teams] = useState<Team[]>(MOCK_TEAMS);
  return { teams, loading: false };
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  title: string;
  status: string;
  progress: number | null;
  target_date: string | null;
  description: string | null;
  is_company_goal: boolean;
  team_id: string;
  owner_id: string | null;
  created_at: string | null;
  owner_name?: string;
  owner_initials?: string;
  team_name?: string;
}

const MOCK_GOALS: Goal[] = [
  // Company Goals
  { id: 'g-1', title: 'Reach 500 active VA placements by Q2', status: 'on_track', progress: 72, target_date: '2026-06-30', description: 'Scale our active VA placement count from 380 to 500 by end of Q2. Currently at 472 placements with strong pipeline momentum.', is_company_goal: true, team_id: 't-leadership', owner_id: 'u-marcio', created_at: '2026-01-05', owner_name: 'Marcio Goncalves', owner_initials: 'MG', team_name: 'Leadership' },
  { id: 'g-2', title: 'Achieve $2M ARR', status: 'on_track', progress: 68, target_date: '2026-06-30', description: 'Grow annual recurring revenue to $2M through new enterprise accounts and upsells on existing contracts.', is_company_goal: true, team_id: 't-leadership', owner_id: 'u-marcio', created_at: '2026-01-05', owner_name: 'Marcio Goncalves', owner_initials: 'MG', team_name: 'Leadership' },
  { id: 'g-3', title: 'Launch AI-powered VA matching platform', status: 'off_track', progress: 35, target_date: '2026-03-31', description: 'Build and deploy the AI matching engine that pairs clients with the best-fit VAs based on skills, timezone, and work style. Behind schedule due to ML model training delays.', is_company_goal: true, team_id: 't-leadership', owner_id: 'u-rodrigo', created_at: '2026-01-05', owner_name: 'Rodrigo De Paula', owner_initials: 'RD', team_name: 'Leadership' },
  { id: 'g-4', title: 'Expand to 3 new markets (LATAM, SEA, Africa)', status: 'on_track', progress: 45, target_date: '2026-06-30', description: 'Establish VA operations in Latin America, Southeast Asia, and Africa with local partner networks and compliance frameworks.', is_company_goal: true, team_id: 't-leadership', owner_id: 'u-marcio', created_at: '2026-01-05', owner_name: 'Marcio Goncalves', owner_initials: 'MG', team_name: 'Leadership' },
  { id: 'g-5', title: 'Maintain 95%+ client retention rate', status: 'complete', progress: 100, target_date: '2026-03-31', description: 'Keep client churn below 5% through proactive account management and VA quality monitoring. Achieved 96.2% retention this quarter.', is_company_goal: true, team_id: 't-leadership', owner_id: 'u-thavani', created_at: '2026-01-05', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Leadership' },

  // Operations Team Goals
  { id: 'g-6', title: 'Reduce VA onboarding time to <48 hours', status: 'on_track', progress: 80, target_date: '2026-03-31', description: 'Streamline the VA onboarding process from current 52-hour average down to under 48 hours through automation and checklist improvements.', is_company_goal: false, team_id: 't-operations', owner_id: 'u-thavani', created_at: '2026-01-10', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Operations' },
  { id: 'g-7', title: 'Achieve 99.5% uptime on client portal', status: 'on_track', progress: 92, target_date: '2026-03-31', description: 'Improve infrastructure reliability to meet 99.5% uptime SLA for the client-facing portal where clients manage their VAs.', is_company_goal: false, team_id: 't-operations', owner_id: 'u-rodrigo', created_at: '2026-01-10', owner_name: 'Rodrigo De Paula', owner_initials: 'RD', team_name: 'Operations' },
  { id: 'g-8', title: 'Automate 70% of timesheet processing', status: 'off_track', progress: 40, target_date: '2026-03-31', description: 'Reduce manual timesheet review by automating validation, approval workflows, and client billing integration. Currently at 40% automation.', is_company_goal: false, team_id: 't-operations', owner_id: 'u-thavani', created_at: '2026-01-10', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Operations' },

  // Sales Team Goals
  { id: 'g-9', title: 'Close 25 new enterprise accounts in Q1', status: 'on_track', progress: 76, target_date: '2026-03-31', description: 'Acquire 25 new enterprise-level accounts (>$3K/month) through outbound prospecting and inbound lead conversion.', is_company_goal: false, team_id: 't-sales', owner_id: null, created_at: '2026-01-10', owner_name: 'Unassigned', owner_initials: '??', team_name: 'Sales' },
  { id: 'g-10', title: 'Increase average deal size to $5K/month', status: 'on_track', progress: 60, target_date: '2026-03-31', description: 'Move upmarket by targeting larger accounts and bundling premium services (dedicated account managers, 24/7 coverage).', is_company_goal: false, team_id: 't-sales', owner_id: null, created_at: '2026-01-10', owner_name: 'Unassigned', owner_initials: '??', team_name: 'Sales' },

  // Marketing Team Goals
  { id: 'g-11', title: 'Generate 200 qualified leads per month', status: 'on_track', progress: 85, target_date: '2026-03-31', description: 'Increase marketing qualified leads to 200/month through content marketing, paid campaigns, and webinar series.', is_company_goal: false, team_id: 't-marketing', owner_id: null, created_at: '2026-01-10', owner_name: 'Unassigned', owner_initials: '??', team_name: 'Marketing' },
  { id: 'g-12', title: 'Increase organic traffic by 40%', status: 'off_track', progress: 22, target_date: '2026-03-31', description: 'Grow organic search traffic through SEO optimization, blog content strategy, and technical SEO improvements. Slow progress due to Google algorithm changes.', is_company_goal: false, team_id: 't-marketing', owner_id: null, created_at: '2026-01-10', owner_name: 'Unassigned', owner_initials: '??', team_name: 'Marketing' },
];

export function useGoals() {
  const [goals] = useState<Goal[]>(MOCK_GOALS);
  return { goals, loading: false };
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  task_type: string;
  team_name: string | null;
  team_id: string | null;
  user_id: string | null;
  created_at: string;
  owner_name?: string;
}

const MOCK_TASKS: Task[] = [
  // Personal tasks
  { id: 'tk-1', title: 'Review Q1 client satisfaction survey results', status: 'done', due_date: '2026-03-15', task_type: 'personal', team_name: null, team_id: null, user_id: 'u-marcio', created_at: '2026-03-10', owner_name: 'Marcio Goncalves' },
  { id: 'tk-2', title: 'Prepare board meeting presentation for March', status: 'todo', due_date: '2026-03-25', task_type: 'personal', team_name: null, team_id: null, user_id: 'u-marcio', created_at: '2026-03-12', owner_name: 'Marcio Goncalves' },
  { id: 'tk-3', title: 'Update employee handbook v2.0', status: 'todo', due_date: '2026-03-28', task_type: 'personal', team_name: null, team_id: null, user_id: 'u-marcio', created_at: '2026-03-08', owner_name: 'Marcio Goncalves' },
  { id: 'tk-4', title: 'Schedule 1:1s with team leads this week', status: 'done', due_date: '2026-03-20', task_type: 'personal', team_name: null, team_id: null, user_id: 'u-marcio', created_at: '2026-03-17', owner_name: 'Marcio Goncalves' },
  { id: 'tk-5', title: 'Draft SOPs for new client onboarding', status: 'todo', due_date: '2026-03-31', task_type: 'personal', team_name: null, team_id: null, user_id: 'u-marcio', created_at: '2026-03-14', owner_name: 'Marcio Goncalves' },

  // Operations team tasks
  { id: 'tk-6', title: 'Onboard 5 new VAs for Acme Corp account', status: 'todo', due_date: '2026-03-24', task_type: 'team', team_name: 'Operations', team_id: 't-operations', user_id: 'u-thavani', created_at: '2026-03-16', owner_name: 'Thavani' },
  { id: 'tk-7', title: 'Complete ISO 27001 security audit documentation', status: 'todo', due_date: '2026-03-28', task_type: 'team', team_name: 'Operations', team_id: 't-operations', user_id: 'u-rodrigo', created_at: '2026-03-11', owner_name: 'Rodrigo De Paula' },
  { id: 'tk-8', title: 'Set up automated timesheet reminders', status: 'done', due_date: '2026-03-18', task_type: 'team', team_name: 'Operations', team_id: 't-operations', user_id: 'u-thavani', created_at: '2026-03-10', owner_name: 'Thavani' },
  { id: 'tk-9', title: 'Migrate client portal to new hosting', status: 'todo', due_date: '2026-03-26', task_type: 'team', team_name: 'Operations', team_id: 't-operations', user_id: 'u-rodrigo', created_at: '2026-03-13', owner_name: 'Rodrigo De Paula' },

  // Marketing team tasks
  { id: 'tk-10', title: 'Launch LinkedIn thought leadership campaign', status: 'todo', due_date: '2026-03-22', task_type: 'team', team_name: 'Marketing', team_id: 't-marketing', user_id: null, created_at: '2026-03-15', owner_name: '' },
  { id: 'tk-11', title: 'Create case study: TechFlow partnership', status: 'done', due_date: '2026-03-14', task_type: 'team', team_name: 'Marketing', team_id: 't-marketing', user_id: null, created_at: '2026-03-05', owner_name: '' },
  { id: 'tk-12', title: 'Update website pricing page with new tiers', status: 'todo', due_date: '2026-03-27', task_type: 'team', team_name: 'Marketing', team_id: 't-marketing', user_id: null, created_at: '2026-03-18', owner_name: '' },

  // Sales team tasks
  { id: 'tk-13', title: 'Follow up with 12 enterprise leads from webinar', status: 'todo', due_date: '2026-03-21', task_type: 'team', team_name: 'Sales', team_id: 't-sales', user_id: null, created_at: '2026-03-19', owner_name: '' },
  { id: 'tk-14', title: 'Prepare demo for FinServ Corp pilot', status: 'todo', due_date: '2026-03-23', task_type: 'team', team_name: 'Sales', team_id: 't-sales', user_id: null, created_at: '2026-03-17', owner_name: '' },
  { id: 'tk-15', title: 'Close renewal for DataBridge account', status: 'done', due_date: '2026-03-19', task_type: 'team', team_name: 'Sales', team_id: 't-sales', user_id: null, created_at: '2026-03-12', owner_name: '' },
];

export function useTasks() {
  const [tasks] = useState<Task[]>(MOCK_TASKS);
  return { tasks, loading: false };
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export interface MetricRow {
  id: string;
  metric_name: string;
  unit: string;
  target_value: number | null;
  target_logic: string | null;
  owner_name: string;
  owner_initials: string;
  team_name: string;
  weeklyValues: Record<string, number | null>;
}

const WEEK_DATES = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'];

const MOCK_METRICS: MetricRow[] = [
  // Operations team metrics
  { id: 'm-1', metric_name: 'Active VA Placements', unit: 'count', target_value: 500, target_logic: 'above', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Operations', weeklyValues: { '2026-03-02': 456, '2026-03-09': 461, '2026-03-16': 468, '2026-03-23': 472 } },
  { id: 'm-2', metric_name: 'Client Satisfaction (NPS)', unit: 'score', target_value: 85, target_logic: 'above', owner_name: 'Marcio Goncalves', owner_initials: 'MG', team_name: 'Operations', weeklyValues: { '2026-03-02': 82, '2026-03-09': 85, '2026-03-16': 84, '2026-03-23': 86 } },
  { id: 'm-3', metric_name: 'VA Utilization Rate', unit: '%', target_value: 92, target_logic: 'above', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Operations', weeklyValues: { '2026-03-02': 87, '2026-03-09': 89, '2026-03-16': 91, '2026-03-23': 90 } },
  { id: 'm-4', metric_name: 'Avg Onboarding Time (hrs)', unit: 'count', target_value: 48, target_logic: 'below', owner_name: 'Thavani', owner_initials: 'TH', team_name: 'Operations', weeklyValues: { '2026-03-02': 52, '2026-03-09': 50, '2026-03-16': 48, '2026-03-23': 47 } },
  { id: 'm-5', metric_name: 'Support Tickets Resolved', unit: 'count', target_value: 150, target_logic: 'above', owner_name: 'Rodrigo De Paula', owner_initials: 'RD', team_name: 'Operations', weeklyValues: { '2026-03-02': 145, '2026-03-09': 162, '2026-03-16': 158, '2026-03-23': 171 } },

  // Sales team metrics
  { id: 'm-6', metric_name: 'New Enterprise Leads', unit: 'count', target_value: 20, target_logic: 'above', owner_name: 'Sales Lead', owner_initials: 'SL', team_name: 'Sales', weeklyValues: { '2026-03-02': 18, '2026-03-09': 22, '2026-03-16': 15, '2026-03-23': 24 } },
  { id: 'm-7', metric_name: 'Pipeline Value', unit: '$', target_value: 300, target_logic: 'above', owner_name: 'Sales Lead', owner_initials: 'SL', team_name: 'Sales', weeklyValues: { '2026-03-02': 285, '2026-03-09': 310, '2026-03-16': 298, '2026-03-23': 342 } },
  { id: 'm-8', metric_name: 'Demos Scheduled', unit: 'count', target_value: 10, target_logic: 'above', owner_name: 'Sales Lead', owner_initials: 'SL', team_name: 'Sales', weeklyValues: { '2026-03-02': 8, '2026-03-09': 12, '2026-03-16': 10, '2026-03-23': 14 } },
  { id: 'm-9', metric_name: 'Conversion Rate', unit: '%', target_value: 22, target_logic: 'above', owner_name: 'Sales Lead', owner_initials: 'SL', team_name: 'Sales', weeklyValues: { '2026-03-02': 18, '2026-03-09': 22, '2026-03-16': 20, '2026-03-23': 24 } },

  // Marketing team metrics
  { id: 'm-10', metric_name: 'Qualified Leads', unit: 'count', target_value: 50, target_logic: 'above', owner_name: 'Mkt Lead', owner_initials: 'ML', team_name: 'Marketing', weeklyValues: { '2026-03-02': 42, '2026-03-09': 48, '2026-03-16': 51, '2026-03-23': 55 } },
  { id: 'm-11', metric_name: 'Website Sessions', unit: 'count', target_value: 15000, target_logic: 'above', owner_name: 'Mkt Lead', owner_initials: 'ML', team_name: 'Marketing', weeklyValues: { '2026-03-02': 12400, '2026-03-09': 13200, '2026-03-16': 14100, '2026-03-23': 15200 } },
  { id: 'm-12', metric_name: 'LinkedIn Followers', unit: 'count', target_value: 10000, target_logic: 'above', owner_name: 'Mkt Lead', owner_initials: 'ML', team_name: 'Marketing', weeklyValues: { '2026-03-02': 8200, '2026-03-09': 8450, '2026-03-16': 8700, '2026-03-23': 8920 } },
  { id: 'm-13', metric_name: 'Content Published', unit: 'count', target_value: 4, target_logic: 'above', owner_name: 'Mkt Lead', owner_initials: 'ML', team_name: 'Marketing', weeklyValues: { '2026-03-02': 4, '2026-03-09': 3, '2026-03-16': 5, '2026-03-23': 4 } },
];

export function useMetrics() {
  const [metrics] = useState<MetricRow[]>(MOCK_METRICS);
  const [weeks] = useState<string[]>(WEEK_DATES);
  return { metrics, weeks, loading: false };
}

// ─── Issues ─────────────────────────────────────────────────────────────────

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  issue_type: string | null;
  is_public: boolean;
  team_id: string | null;
  team_name?: string;
  created_at: string | null;
  created_by_name?: string;
}

export function useIssues() {
  const [issues] = useState<Issue[]>([
    { id: 'i-1', title: 'Client portal intermittent 504 errors during peak hours', description: 'Multiple clients reporting gateway timeouts between 9-11am EST when VA shift starts.', status: 'open', issue_type: 'bug', is_public: false, team_id: 't-operations', team_name: 'Operations', created_at: '2026-03-18', created_by_name: 'Rodrigo De Paula' },
    { id: 'i-2', title: 'Timesheet auto-submit not triggering for LATAM timezone VAs', description: 'VAs in UTC-3 to UTC-5 timezones are not getting auto-submit at midnight their local time.', status: 'open', issue_type: 'bug', is_public: false, team_id: 't-operations', team_name: 'Operations', created_at: '2026-03-16', created_by_name: 'Thavani' },
    { id: 'i-3', title: 'Proposal: Tiered pricing restructure for enterprise accounts', description: 'Introduce Bronze/Silver/Gold tiers with volume discounts starting at 10+ VAs.', status: 'in_review', issue_type: 'feature', is_public: true, team_id: 't-sales', team_name: 'Sales', created_at: '2026-03-14', created_by_name: 'Marcio Goncalves' },
    { id: 'i-4', title: 'LinkedIn ad spend exceeding budget by 15%', description: 'Campaign CPC has increased due to competitor bidding on our branded keywords.', status: 'open', issue_type: 'issue', is_public: false, team_id: 't-marketing', team_name: 'Marketing', created_at: '2026-03-12', created_by_name: '' },
  ]);
  return { issues, loading: false };
}

// ─── Meetings ───────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  meeting_title: string | null;
  meeting_type: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  team_id: string | null;
  team_name?: string;
  started_by_name?: string;
}

export function useMeetings() {
  const [meetings] = useState<Meeting[]>([
    { id: 'mt-1', meeting_title: 'Leadership Weekly Sync', meeting_type: 'recurring', status: 'completed', started_at: '2026-03-17T14:00:00Z', ended_at: '2026-03-17T14:45:00Z', team_id: 't-leadership', team_name: 'Leadership', started_by_name: 'Marcio Goncalves' },
    { id: 'mt-2', meeting_title: 'Ops Daily Standup', meeting_type: 'recurring', status: 'completed', started_at: '2026-03-20T13:00:00Z', ended_at: '2026-03-20T13:15:00Z', team_id: 't-daily-ops', team_name: 'Daily - Operations', started_by_name: 'Thavani' },
    { id: 'mt-3', meeting_title: 'Sales Pipeline Review', meeting_type: 'recurring', status: 'scheduled', started_at: '2026-03-21T15:00:00Z', ended_at: null, team_id: 't-sales', team_name: 'Sales', started_by_name: '' },
    { id: 'mt-4', meeting_title: 'Q1 Retrospective Planning', meeting_type: 'one_time', status: 'scheduled', started_at: '2026-03-24T16:00:00Z', ended_at: null, team_id: 't-leadership', team_name: 'Leadership', started_by_name: 'Marcio Goncalves' },
    { id: 'mt-5', meeting_title: 'Growth Squad Sprint Review', meeting_type: 'recurring', status: 'completed', started_at: '2026-03-19T17:00:00Z', ended_at: '2026-03-19T17:30:00Z', team_id: 't-growth', team_name: 'Growth Squad', started_by_name: 'Rodrigo De Paula' },
  ]);
  return { meetings, loading: false };
}

// ─── People (Company Members) ───────────────────────────────────────────────

export interface Person {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  permission_level: string;
  status: string;
  joined_at: string;
  initials: string;
}

export function usePeople() {
  const [people] = useState<Person[]>([
    { id: 'cm-1', user_id: 'u-marcio', full_name: 'Marcio Goncalves', email: 'marcio@wisevas.io', avatar_url: null, role: 'CEO', permission_level: 'owner', status: 'active', joined_at: '2024-06-01', initials: 'MG' },
    { id: 'cm-2', user_id: 'u-rodrigo', full_name: 'Rodrigo De Paula', email: 'rodrigo@wisevas.io', avatar_url: null, role: 'Product & Design', permission_level: 'admin', status: 'active', joined_at: '2024-07-15', initials: 'RD' },
    { id: 'cm-3', user_id: 'u-thavani', full_name: 'Thavani', email: 'thavani@wisevas.io', avatar_url: null, role: 'Operations Lead', permission_level: 'admin', status: 'active', joined_at: '2024-08-20', initials: 'TH' },
  ]);
  return { people, loading: false };
}

// ─── Org Chart ──────────────────────────────────────────────────────────────

export interface OrgRole {
  id: string;
  title: string;
  reports_to_role_id: string | null;
  responsibilities: string | null;
  department_id: string | null;
  assigned_user?: string;
  assigned_user_initials?: string;
}

export function useOrgRoles() {
  const [roles] = useState<OrgRole[]>([
    { id: 'or-1', title: 'CEO', reports_to_role_id: null, responsibilities: 'Overall company strategy, investor relations, key partnerships', department_id: null, assigned_user: 'Marcio Goncalves', assigned_user_initials: 'MG' },
    { id: 'or-2', title: 'Head of Product & Design', reports_to_role_id: 'or-1', responsibilities: 'Product roadmap, UX/UI design, platform development', department_id: null, assigned_user: 'Rodrigo De Paula', assigned_user_initials: 'RD' },
    { id: 'or-3', title: 'Head of Operations', reports_to_role_id: 'or-1', responsibilities: 'VA onboarding, client delivery, quality assurance', department_id: null, assigned_user: 'Thavani', assigned_user_initials: 'TH' },
    { id: 'or-4', title: 'Head of Sales', reports_to_role_id: 'or-1', responsibilities: 'Enterprise sales, partnerships, revenue growth', department_id: null },
    { id: 'or-5', title: 'Head of Marketing', reports_to_role_id: 'or-1', responsibilities: 'Brand, content, demand generation, community', department_id: null },
  ]);
  return { roles, loading: false };
}

// ─── Health Assessments ─────────────────────────────────────────────────────

export interface HealthAssessment {
  id: string;
  title: string;
  status: string;
  assessment_date: string;
  overall_score: number | null;
  respondent_count: number | null;
}

export function useHealthAssessments() {
  const [assessments] = useState<HealthAssessment[]>([
    { id: 'ha-1', title: 'Q1 2026 Team Health Check', status: 'completed', assessment_date: '2026-03-15', overall_score: 82, respondent_count: 18 },
    { id: 'ha-2', title: 'Q4 2025 Team Health Check', status: 'completed', assessment_date: '2025-12-20', overall_score: 78, respondent_count: 15 },
  ]);
  return { assessments, loading: false };
}

// ─── Strategy ───────────────────────────────────────────────────────────────

export interface StrategicPlan {
  id: string;
  title: string | null;
  plan_data: any;
  swot_data: any;
  team_id: string | null;
  team_name?: string;
  is_active: boolean;
  updated_at: string;
}

export function useStrategicPlans() {
  const [plans] = useState<StrategicPlan[]>([
    {
      id: 'sp-1',
      title: 'WiseVAs 2026 Growth Strategy',
      plan_data: { vision: 'Become the #1 AI-powered VA staffing platform globally', mission: 'Connect businesses with exceptional virtual assistants through technology and human expertise' },
      swot_data: { strengths: ['Strong NPS (86)', 'Fast onboarding (<48hrs)', 'Multi-market presence'], weaknesses: ['AI matching platform delayed', 'Organic traffic growth slow'], opportunities: ['LATAM/SEA/Africa expansion', 'Enterprise segment growth'], threats: ['Competitor automation tools', 'Economic uncertainty'] },
      team_id: 't-leadership',
      team_name: 'Leadership',
      is_active: true,
      updated_at: '2026-03-18',
    },
  ]);
  return { plans, loading: false };
}

// ─── Training Progress ──────────────────────────────────────────────────────

export interface TrainingProgress {
  id: string;
  path_slug: string;
  lesson_slug: string;
  status: string;
  quiz_score: number | null;
  completed_at: string | null;
  user_id: string;
}

export function useTrainingProgressData() {
  const [progress] = useState<TrainingProgress[]>([
    { id: 'tp-1', path_slug: 'va-onboarding', lesson_slug: 'intro-to-wisevas', status: 'completed', quiz_score: 95, completed_at: '2026-02-10', user_id: 'u-thavani' },
    { id: 'tp-2', path_slug: 'va-onboarding', lesson_slug: 'client-communication', status: 'completed', quiz_score: 88, completed_at: '2026-02-15', user_id: 'u-thavani' },
    { id: 'tp-3', path_slug: 'leadership', lesson_slug: 'okr-framework', status: 'in_progress', quiz_score: null, completed_at: null, user_id: 'u-marcio' },
  ]);
  return { progress, loading: false };
}

// ─── Dashboard Aggregate ────────────────────────────────────────────────────

export function useDashboardData() {
  // Pre-compute dashboard KPIs from mock data
  const completedGoals = MOCK_GOALS.filter(g => g.status === 'complete');
  const completedGoalsPct = Math.round((completedGoals.length / MOCK_GOALS.length) * 100); // ~8% (1 of 12)

  // Use the specified 33% for completed goals this quarter and 42% for tasks
  const dashboardGoals = MOCK_GOALS.slice(0, 5);
  const dashboardTasks = MOCK_TASKS.slice(0, 5);
  const dashboardMetrics = MOCK_METRICS.slice(0, 5);

  const doneTasks = MOCK_TASKS.filter(t => t.status === 'done');
  const completedTasksPct = Math.round((doneTasks.length / MOCK_TASKS.length) * 100);

  const [data] = useState({
    goals: dashboardGoals,
    tasks: dashboardTasks,
    metrics: dashboardMetrics,
    completedGoalsPct: 33, // as specified: 33% this quarter
    completedTasksPct: 42, // as specified: 42% last 7 days
    loading: false,
  });

  return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export { WISEVA_COMPANY_ID };
