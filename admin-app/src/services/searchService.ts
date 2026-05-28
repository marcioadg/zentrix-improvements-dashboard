import { SearchResult, SearchCategory } from '@/contexts/CommandPaletteContext';
import { logger } from '@/utils/logger';

// Create a navigate function that can be injected from components that use this service
let navigateFunction: ((path: string) => void) | null = null;

export const setNavigateFunction = (navigate: (path: string) => void) => {
  navigateFunction = navigate;
};

// Mock search data - structured for easy extension with Supabase later
export const getSearchResults = (): SearchCategory[] => {
  return [
    {
      name: 'Pages',
      results: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'View your main dashboard with overview metrics',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/dashboard') {
              if (navigateFunction) {
                navigateFunction('/dashboard');
              } else {
                window.location.href = '/dashboard';
              }
            }
          },
          icon: 'home',
        },
        {
          id: 'people',
          title: 'People',
          description: 'Manage team members and company users',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/people') {
              if (navigateFunction) {
                navigateFunction('/people');
              } else {
                window.location.href = '/people';
              }
            }
          },
          icon: 'users',
        },
        {
          id: 'tasks',
          title: 'Tasks',
          description: 'View and manage all tasks across teams',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/tasks') {
              if (navigateFunction) {
                navigateFunction('/tasks');
              } else {
                window.location.href = '/tasks';
              }
            }
          },
          icon: 'folder',
        },
        {
          id: 'goals',
          title: 'Goals',
          description: 'Track progress on company and team goals',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/goals') {
              if (navigateFunction) {
                navigateFunction('/goals');
              } else {
                window.location.href = '/goals';
              }
            }
          },
          icon: 'target',
        },
        {
          id: 'metrics',
          title: 'Metrics',
          description: 'Analyze performance metrics and KPIs',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/metrics') {
              if (navigateFunction) {
                navigateFunction('/metrics');
              } else {
                window.location.href = '/metrics';
              }
            }
          },
          icon: 'chart',
        },
        {
          id: 'meetings',
          title: 'Meetings',
          description: 'Schedule and manage team meetings',
          category: 'Pages',
          action: () => {
            if (window.location.pathname !== '/meetings') {
              if (navigateFunction) {
                navigateFunction('/meetings');
              } else {
                window.location.href = '/meetings';
              }
            }
          },
          icon: 'calendar',
        },
      ],
    },
    {
      name: 'Settings',
      results: [
        {
          id: 'profile-settings',
          title: 'Profile Settings',
          description: 'Update your personal profile information',
          category: 'Settings',
          action: () => {
            if (window.location.pathname !== '/profile') {
              if (navigateFunction) {
                navigateFunction('/profile');
              } else {
                window.location.href = '/profile';
              }
            }
          },
          icon: 'settings',
        },
        {
          id: 'app-settings',
          title: 'App Settings',
          description: 'Manage application settings and preferences',
          category: 'Settings',
          action: () => {
            if (window.location.pathname !== '/settings') {
              if (navigateFunction) {
                navigateFunction('/settings');
              } else {
                window.location.href = '/settings';
              }
            }
          },
          icon: 'settings',
        },
        {
          id: 'permissions',
          title: 'Permissions',
          description: 'Manage user roles and permissions',
          category: 'Settings',
          action: () => {
            if (window.location.pathname !== '/permissions') {
              if (navigateFunction) {
                navigateFunction('/permissions');
              } else {
                window.location.href = '/permissions';
              }
            }
          },
          icon: 'settings',
        },
      ],
    },
    {
      name: 'Quick Actions',
      results: [
        {
          id: 'add-member',
          title: 'Add Team Member',
          description: 'Invite a new person to join your team',
          category: 'Quick Actions',
          action: () => {
            logger.log('Opening add member modal');
            // Trigger add member modal if available
            if ((window as any).openAddMemberModal) {
              (window as any).openAddMemberModal();
            } else if (navigateFunction) {
              navigateFunction('/people');
            } else {
              window.location.href = '/people';
            }
          },
          icon: 'users',
        },
        {
          id: 'create-task',
          title: 'Create Task',
          description: 'Add a new task to track progress',
          category: 'Quick Actions',
          action: () => {
            logger.log('Opening create task modal');
            // Trigger create task modal if available
            if ((window as any).openCreateTaskModal) {
              (window as any).openCreateTaskModal();
            } else if (navigateFunction) {
              navigateFunction('/tasks');
            } else {
              window.location.href = '/tasks';
            }
          },
          icon: 'folder',
        },
        {
          id: 'set-goal',
          title: 'Set Goal',
          description: 'Define a new goal for your team',
          category: 'Quick Actions',
          action: () => {
            logger.log('Opening create goal modal');
            // Trigger create goal modal if available
            if ((window as any).openCreateGoalModal) {
              (window as any).openCreateGoalModal();
            } else if (navigateFunction) {
              navigateFunction('/goals');
            } else {
              window.location.href = '/goals';
            }
          },
          icon: 'target',
        },
        {
          id: 'schedule-meeting',
          title: 'Go to Meeting',
          description: 'Plan a new team meeting',
          category: 'Quick Actions',
          action: () => {
            if (window.location.pathname !== '/meetings') {
              if (navigateFunction) {
                navigateFunction('/meetings');
              } else {
                window.location.href = '/meetings';
              }
            }
          },
          icon: 'calendar',
        },
      ],
    },
  ];
};

// Future: Replace with Supabase queries
// export const searchDatabase = async (query: string): Promise<SearchCategory[]> => {
//   const { data, error } = await supabase
//     .from('searchable_items')
//     .select('*')
//     .textSearch('title,description', query);
//   
//   if (error) throw error;
//   return transformToCategories(data);
// };