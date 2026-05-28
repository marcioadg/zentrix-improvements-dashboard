
import { type UIPermissionLevel } from './permissionMapping';

export interface CapabilityDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
}

export const CAPABILITY_CATEGORIES = [
  'Metrics & Data',
  'Team Management', 
  'Meetings & Communication',
  'Planning & Strategy',
  'Administration',
  'System Access'
];

export const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  // Metrics & Data
  { key: 'view_metrics', label: 'View Metrics', description: 'Can view team metrics and dashboards', category: 'Metrics & Data' },
  { key: 'edit_metrics', label: 'Edit Metrics', description: 'Can edit any metric values (not restricted by ownership)', category: 'Metrics & Data' },
  { key: 'manage_metrics', label: 'Manage Metrics', description: 'Can create, delete, and fully manage metrics', category: 'Metrics & Data' },
  { key: 'view_company_data', label: 'View Company Data', description: 'Can access company-wide data and reports', category: 'Metrics & Data' },
  { key: 'access_analytics', label: 'Access Analytics', description: 'Can view advanced analytics and reports', category: 'Metrics & Data' },
  
  // Team Management
  { key: 'view_team_info', label: 'View Team Info', description: 'Can view team member information', category: 'Team Management' },
  { key: 'manage_assigned_teams', label: 'Manage Assigned Teams', description: 'Can manage teams they are assigned to', category: 'Team Management' },
  { key: 'add_remove_team_members', label: 'Add/Remove Team Members', description: 'Can add and remove team members', category: 'Team Management' },
  { key: 'create_teams', label: 'Create Teams', description: 'Can create new teams', category: 'Team Management' },
  { key: 'manage_team_settings', label: 'Manage Team Settings', description: 'Can modify team configurations', category: 'Team Management' },
  { key: 'manage_all_teams', label: 'Manage All Teams', description: 'Can manage any team in the organization', category: 'Team Management' },
  
  // Meetings & Communication
  { key: 'participate_meetings', label: 'Participate in Meetings', description: 'Can join and participate in team meetings', category: 'Meetings & Communication' },
  { key: 'conduct_meetings', label: 'Conduct Meetings', description: 'Can lead and facilitate meetings', category: 'Meetings & Communication' },
  
  // Planning & Strategy
  { key: 'vote_issues', label: 'Vote on Issues', description: 'Can vote on team issues and priorities', category: 'Planning & Strategy' },
  { key: 'create_personal_tasks', label: 'Create Personal Tasks', description: 'Can create and manage personal tasks', category: 'Planning & Strategy' },
  { key: 'assign_tasks_others', label: 'Assign Tasks to Others', description: 'Can assign tasks to other team members', category: 'Planning & Strategy' },
  { key: 'strategic_planning', label: 'Strategic Planning', description: 'Can participate in strategic planning activities', category: 'Planning & Strategy' },
  
  // Administration
  { key: 'access_dashboard', label: 'Access Dashboard', description: 'Can access the main dashboard', category: 'Administration' },
  { key: 'company_settings', label: 'Company Settings', description: 'Can modify company-wide settings', category: 'Administration' },
  { key: 'financial_data', label: 'Financial Data', description: 'Can access financial information', category: 'Administration' },
  { key: 'manage_users', label: 'Manage Users', description: 'Can manage user accounts and permissions', category: 'Administration' },
  
  // System Access
  { key: 'full_company_access', label: 'Full Company Access', description: 'Can access all company resources', category: 'System Access' },
  { key: 'system_wide_access', label: 'System-wide Access', description: 'Can access system-level features', category: 'System Access' },
  { key: 'manage_multiple_companies', label: 'Manage Multiple Companies', description: 'Can manage multiple company instances', category: 'System Access' },
  { key: 'override_security', label: 'Override Security', description: 'Can override security restrictions', category: 'System Access' },
  { key: 'access_admin_panel', label: 'Access Admin Panel', description: 'Can access administrative panels', category: 'System Access' }
];

export const PERMISSION_LEVEL_CAPABILITIES: Record<UIPermissionLevel, string[]> = {
  'inactive': [
    // Inactive users have no capabilities
  ],
  'view-only': [
    'view_metrics',
    'view_team_info',
    'participate_meetings',
    'vote_issues'
  ],
  'member': [
    'view_metrics',
    'edit_metrics', // All users can edit any metrics
    'view_team_info',
    'participate_meetings', 
    'create_personal_tasks',
    'vote_issues',
    'access_dashboard'
    // Note: NO view_company_data - members have team-only access
  ],
  'manager': [
    'view_metrics',
    'edit_metrics',
    'manage_metrics', // Managers+ can create/delete metrics
    'view_team_info',
    'participate_meetings',
    'create_personal_tasks', 
    'vote_issues',
    'access_dashboard',
    'view_company_data',
    'manage_assigned_teams',
    'add_remove_team_members',
    'conduct_meetings',
    'create_teams',
    'manage_team_settings',
    'assign_tasks_others',
    'access_analytics',
    'strategic_planning'
  ],
  'director': [
    'view_metrics',
    'edit_metrics',
    'manage_metrics',
    'view_team_info',
    'participate_meetings',
    'create_personal_tasks',
    'vote_issues', 
    'access_dashboard',
    'view_company_data',
    'manage_assigned_teams',
    'add_remove_team_members',
    'conduct_meetings',
    'create_teams',
    'manage_team_settings',
    'assign_tasks_others',
    'access_analytics',
    'strategic_planning',
    'full_company_access',
    'manage_all_teams',
    'company_settings',
    'financial_data',
    'manage_users'
  ],
  'super_admin': [
    'view_metrics',
    'edit_metrics',
    'manage_metrics',
    'view_team_info',
    'participate_meetings',
    'create_personal_tasks',
    'vote_issues',
    'access_dashboard', 
    'view_company_data',
    'manage_assigned_teams',
    'add_remove_team_members',
    'conduct_meetings',
    'create_teams',
    'manage_team_settings',
    'assign_tasks_others',
    'access_analytics',
    'strategic_planning',
    'full_company_access',
    'manage_all_teams',
    'company_settings',
    'financial_data',
    'manage_users',
    'system_wide_access',
    'manage_multiple_companies',
    'override_security',
    'access_admin_panel'
  ]
};
