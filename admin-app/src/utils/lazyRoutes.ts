
import { lazy } from 'react';
import lazyWithRetry from './lazyWithRetry';

// Lazy load all page components for better performance
export const LazyDashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
export const LazyTasks = lazyWithRetry(() => import('@/pages/Tasks'));
export const LazyTasks2 = lazyWithRetry(() => import('@/pages/Tasks2'));
export const LazyTasks3 = lazyWithRetry(() => import('@/pages/Tasks')); // Same as LazyTasks for backup
export const LazyTasksMobile = lazyWithRetry(() => import('@/pages/TasksMobile'));
export const LazyGoals = lazyWithRetry(() => import('@/pages/Goals'));
export const LazyGoalsMobile = lazyWithRetry(() => import('@/pages/GoalsMobile'));
export const LazyIssues = lazyWithRetry(() => import('@/pages/Issues'));
export const LazyIssuesMobile = lazyWithRetry(() => import('@/pages/IssuesMobile'));
export const LazyMetrics = lazyWithRetry(() => import('@/pages/Metrics'));
export const LazyNewMetrics = lazyWithRetry(() => import('@/pages/NewMetrics'));
export const LazyHealth = lazyWithRetry(() => import('@/pages/Health'));
export const LazyMetricsMobile = lazyWithRetry(() => import('@/pages/MetricsMobile'));
export const LazyAnalyticsMobile = lazyWithRetry(() => import('@/pages/AnalyticsMobile'));
export const LazyOrgChartMobile = lazyWithRetry(() => import('@/pages/OrgChartMobile'));
export const LazyMeetingMobile = lazyWithRetry(() => import('@/pages/MeetingMobile'));
export const LazyCompanyMobile = lazyWithRetry(() => import('@/pages/CompanyMobile'));
export const LazyMobileSettings = lazyWithRetry(() => import('@/pages/MobileSettings'));
export const LazyMobileLogin = lazyWithRetry(() => import('@/pages/MobileLogin'));
export const LazyMeetings = lazyWithRetry(() => import('@/pages/Meetings'));
export const LazyMeeting = lazyWithRetry(() => import('@/pages/Meeting'));
export const LazyPeople = lazyWithRetry(() => import('@/pages/People'));
export const LazyPartnerHub = lazyWithRetry(() => import('@/pages/PartnerHub'));
export const LazyProcess = lazyWithRetry(() => import('@/pages/Process'));
export const LazyProcess2 = lazyWithRetry(() => import('@/pages/Process2'));
export const LazyStrategy = lazyWithRetry(() => import('@/pages/Strategy'));
export const LazyOrgChart = lazyWithRetry(() => import('@/pages/OrgChart'));
export const LazyTools = lazyWithRetry(() => import('@/pages/Tools'));
export const LazyDelegateElevate = lazyWithRetry(() => import('@/pages/tools/DelegateElevate'));
export const LazyClarityBreakJournal = lazyWithRetry(() => import('@/pages/tools/ClarityBreakJournal'));
export const LazyAIThoughtPartner = lazyWithRetry(() => import('@/pages/AIThoughtPartner'));
export const LazyPermissions = lazyWithRetry(() => import('@/pages/Permissions'));
export const LazyTesting = lazyWithRetry(() => import('@/pages/Testing'));
export const LazySidebarTest = lazy(() => import('@/pages/SidebarTest').then(module => ({
  default: module.SidebarTest
})));
export const LazySpeedTest = lazyWithRetry(() => import('@/pages/SpeedTest'));
export const LazyProfile = lazyWithRetry(() => import('@/pages/Profile'));
export const LazyAnalytics = lazyWithRetry(() => import('@/pages/Analytics'));
export const LazySettings = lazyWithRetry(() => import('@/pages/Settings'));
export const LazyOptimizedRLSManagement = lazyWithRetry(() => import('@/pages/OptimizedRLSManagement'));
export const LazySimpleRLS = lazyWithRetry(() => import('@/pages/SimpleRLS'));
export const LazyDataAccessAnalyzer = lazyWithRetry(() => import('@/pages/DataAccessAnalyzer'));
export const LazyAdminPanel = lazy(() => import('@/pages/admin/AdminPanel').then(module => ({
  default: module.AdminPanel
})));
export const LazyCompanyManagement = lazy(() => import('@/pages/admin/CompanyManagement').then(module => ({
  default: module.CompanyManagement
})));
export const LazyPlatformUsage = lazyWithRetry(() => import('@/pages/admin/PlatformUsage'));
export const LazyNotFound = lazyWithRetry(() => import('@/pages/NotFound'));
export const LazyHome2 = lazyWithRetry(() => import('@/pages/Home2'));
export const LazyHome3 = lazyWithRetry(() => import('@/pages/Home3'));
export const LazyHome4 = lazyWithRetry(() => import('@/pages/Home4'));
export const LazyHome5 = lazyWithRetry(() => import('@/pages/Home5'));
export const LazyHome6 = lazyWithRetry(() => import('@/pages/Home6'));
export const LazyHome77 = lazyWithRetry(() => import('@/pages/Home77'));

// Auth components
export const LazyLogin = lazyWithRetry(() => import('@/pages/Login'));
export const LazySignup = lazyWithRetry(() => import('@/pages/Signup'));
export const LazyForgotPassword = lazyWithRetry(() => import('@/pages/ForgotPassword'));
export const LazyResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));
export const LazyEmailConfirmation = lazyWithRetry(() => import('@/pages/EmailConfirmation'));
export const LazyAuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback'));
export const LazyEmailVerified = lazyWithRetry(() => import('@/pages/EmailVerified'));
export const LazyCompleteInvitation = lazyWithRetry(() => import('@/pages/CompleteInvitation'));
export const LazyAcceptInvitation = lazyWithRetry(() => import('@/pages/AcceptInvitation'));
export const LazyJoinViaLink = lazyWithRetry(() => import('@/pages/JoinViaLink'));
export const LazyAccountDeactivated = lazyWithRetry(() => import('@/pages/AccountDeactivated'));

// Onboarding components
export const LazyOnboarding = lazyWithRetry(() => import('@/pages/Onboarding'));
export const LazyNewCompany = lazyWithRetry(() => import('@/pages/NewCompany'));
export const LazyNotificationCenter = lazyWithRetry(() => import('@/pages/NotificationCenter'));

// Checkout components
export const LazyCheckout = lazyWithRetry(() => import('@/pages/Checkout'));

// Theme
export const LazyThemePicker = lazyWithRetry(() => import('@/pages/ThemePicker'));

// Legal Pages
export const LazyScience = lazyWithRetry(() => import('@/pages/Science'));
export const LazyPrivacy = lazyWithRetry(() => import('@/pages/Privacy'));
export const LazyTerms = lazyWithRetry(() => import('@/pages/Terms'));
export const LazyDocs = lazyWithRetry(() => import('@/pages/DocsPage'));
export const LazyAccountDeletion = lazyWithRetry(() => import('@/pages/AccountDeletion'));

// SOPs components
export const LazySopsLayout = lazy(() => import('@/components/sops/SopsLayout').then(module => ({
  default: module.SopsLayout
})));
export const LazySopsHome = lazy(() => import('@/pages/sops/SopsHome').then(module => ({
  default: module.SopsHome
})));
export const LazySopsTemplates = lazy(() => import('@/components/sops/templates/TemplatesGallery').then(module => ({
  default: module.TemplatesGallery
})));
export const LazySopsSpace = lazy(() => import('@/pages/sops/SopsSpace').then(module => ({
  default: module.SopsSpace
})));
export const LazySopsPage = lazy(() => import('@/pages/sops/SopsPage').then(module => ({
  default: module.SopsPage
})));


// Mobile Processes
export const LazyProcessesHome = lazyWithRetry(() => import('@/pages/mobile/processes/ProcessesHome'));
export const LazyProcessDetail = lazyWithRetry(() => import('@/pages/mobile/processes/ProcessDetail'));

// Prototypes
export const LazyLinearDashboard = lazyWithRetry(() => import('@/pages/prototypes/LinearDashboard'));
export const LazyLinearTasks = lazyWithRetry(() => import('@/pages/prototypes/LinearTasks'));
export const LazyLinearGoals = lazyWithRetry(() => import('@/pages/prototypes/LinearGoals'));
export const LazyLinearMetrics = lazyWithRetry(() => import('@/pages/prototypes/LinearMetrics'));
export const LazyLinearIssues = lazyWithRetry(() => import('@/pages/prototypes/LinearIssues'));
export const LazyLinearMeetings = lazyWithRetry(() => import('@/pages/prototypes/LinearMeetings'));
export const LazyLinearPeople = lazyWithRetry(() => import('@/pages/prototypes/LinearPeople'));
export const LazyLinearOrgChart = lazyWithRetry(() => import('@/pages/prototypes/LinearOrgChart'));
export const LazyLinearOrgHealth = lazyWithRetry(() => import('@/pages/prototypes/LinearOrgHealth'));
export const LazyLinearStrategy = lazyWithRetry(() => import('@/pages/prototypes/LinearStrategy'));
export const LazyLinearZentrixAI = lazyWithRetry(() => import('@/pages/prototypes/LinearZentrixAI'));
export const LazyLinearAcademy = lazyWithRetry(() => import('@/pages/prototypes/LinearAcademy'));
export const LazyDashboardV1Bento = lazyWithRetry(() => import('@/pages/prototypes/DashboardV1Bento'));
export const LazyDashboardV2Kanban = lazyWithRetry(() => import('@/pages/prototypes/DashboardV2Kanban'));
export const LazyDashboardV3Timeline = lazyWithRetry(() => import('@/pages/prototypes/DashboardV3Timeline'));
export const LazyDashboardV4Magazine = lazyWithRetry(() => import('@/pages/prototypes/DashboardV4Magazine'));
export const LazyDashboardV5Compact = lazyWithRetry(() => import('@/pages/prototypes/DashboardV5Compact'));
export const LazyDashboardV6Cards = lazyWithRetry(() => import('@/pages/prototypes/DashboardV6Cards'));
export const LazyDashboardV7Split = lazyWithRetry(() => import('@/pages/prototypes/DashboardV7Split'));
export const LazyDashboardV8Metrics = lazyWithRetry(() => import('@/pages/prototypes/DashboardV8Metrics'));
export const LazyDashboardV9Focus = lazyWithRetry(() => import('@/pages/prototypes/DashboardV9Focus'));
export const LazyDashboardV10Executive = lazyWithRetry(() => import('@/pages/prototypes/DashboardV10Executive'));
export const LazyCompDashboard = lazyWithRetry(() => import('@/pages/prototypes/CompDashboard'));
export const LazyCompTasks = lazyWithRetry(() => import('@/pages/prototypes/CompTasks'));
export const LazyCompGoals = lazyWithRetry(() => import('@/pages/prototypes/CompGoals'));
export const LazyCompMetrics = lazyWithRetry(() => import('@/pages/prototypes/CompMetrics'));
export const LazyMeetingV2 = lazyWithRetry(() => import('@/pages/prototypes/MeetingV2'));

// Blog
export const LazyBlog = lazyWithRetry(() => import('@/pages/Blog'));
export const LazyBlogPost = lazyWithRetry(() => import('@/pages/BlogPost'));

// Academy
export const LazyAcademy = lazyWithRetry(() => import('@/pages/ZentrixAcademy'));
export const LazyAcademyPath = lazyWithRetry(() => import('@/pages/AcademyPath'));
export const LazyAcademyLesson = lazyWithRetry(() => import('@/pages/AcademyLesson'));

// Ad Landing
export const LazyAdLanding = lazyWithRetry(() => import('@/pages/AdLanding'));
export const LazyAdLanding2 = lazyWithRetry(() => import('@/pages/AdLanding2'));

// Mobile Onboarding (consumes the /homemobile signup handoff)
export const LazyOnboardingMobile = lazyWithRetry(() => import('@/pages/OnboardingMobile'));

// VTO Builder
export const LazyVTOBuilder = lazyWithRetry(() => import('@/pages/VTOBuilder'));

// Internal Dashboard
export const LazyInternalDashboard = lazyWithRetry(() => import('@/pages/admin/InternalDashboard'));
