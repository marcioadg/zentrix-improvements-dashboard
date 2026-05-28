import React from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { OptimizedProviders } from "@/contexts/OptimizedProviders";
import { AppLoadingProvider } from "@/contexts/AppLoadingContext";
import { OptimisticMeetingEndProvider } from "@/contexts/OptimisticMeetingEndContext";
import { NavigationTransitionProvider } from "@/contexts/NavigationTransitionContext";
import { MeetingEndStateProvider } from "@/contexts/MeetingEndStateContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MobileRouteGuard } from "@/components/auth/MobileRouteGuard";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { PageSuspense } from "@/components/PageSuspense";
import { InvitationChecker } from "@/components/invitations/InvitationChecker";
import { SystemAnnouncementBanner } from "@/components/announcements/SystemAnnouncementBanner";
import { NetworkToast } from "@/components/NetworkToast";
import { CommandPalette } from "@/components/CommandPalette";
import { CommandPaletteProvider } from "@/contexts/CommandPaletteContext";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import { LoginTracker } from "@/components/LoginTracker";
import { ActivityTracker } from "@/components/ActivityTracker";
import { RouteHistoryTracker } from "@/components/navigation/RouteHistoryTracker";
import { GA4RouteTracker } from "@/components/analytics/GA4RouteTracker";
import { PerformancePreloader } from "@/components/performance/PerformancePreloader";
import { SessionAnalyticsProvider } from "@/contexts/SessionAnalyticsContext";
import Index from "./pages/Index";
import MeetingBuilder from "./pages/MeetingBuilder";
import Landing from "./pages/Landing";
import Landing3 from "./pages/Landing3";
import OAuthResult from "./pages/OAuthResult";
// NOTE: Landing2 removed - unused page with pricing that violates Apple App Store Guideline 3.1.1

// Import lazy-loaded components
import {
  LazyDashboard,
  LazyTasks,
  LazyTasks2,
  LazyTasks3,
  LazyTasksMobile,
  LazyGoals,
  LazyGoalsMobile,
  LazyIssues,
  LazyIssuesMobile,
  LazyMetrics,
  LazyNewMetrics,
  LazyMetricsMobile,
  LazyAnalyticsMobile,
  LazyOrgChartMobile,
  LazyMeetingMobile,
  LazyMobileSettings,
  LazyMobileLogin,

  LazyMeetings,
  LazyMeeting,
  LazyPeople,
  LazyPartnerHub,
  LazyProcess,
  LazyProcess2,
  LazyStrategy,
  LazyOrgChart,
  LazyTools,
  LazyDelegateElevate,
  LazyClarityBreakJournal,
  LazyAIThoughtPartner,
  LazyPermissions,
  LazyTesting,
  LazySpeedTest,
  LazyProfile,
  LazyAnalytics,
  LazySettings,
  LazyOptimizedRLSManagement,
  LazySimpleRLS,
  LazyDataAccessAnalyzer,
  LazyAdminPanel,
  LazyCompanyManagement,
  LazyPlatformUsage,
  LazyInternalDashboard,
  LazyNotFound,
  LazyThemePicker,
  LazyHome2,
  LazyHome3,
  LazyHome4,
  LazyHome5,
  LazyHome6,
  LazyHome77,
  LazyLogin,
  LazySignup,
  LazyForgotPassword,
  LazyResetPassword,
   LazyEmailConfirmation,
   LazyAuthCallback,
   LazyCompleteInvitation,
  LazyAcceptInvitation,
  LazyJoinViaLink,
  LazyAccountDeactivated,
  LazyOnboarding,
  LazyNewCompany,
  LazyNotificationCenter,
  LazySidebarTest,
  LazyCheckout,
  LazyEmailVerified,
  LazySopsLayout,
  LazySopsHome,
  LazySopsTemplates,
  LazySopsSpace,
  LazySopsPage,
  LazyScience,
  LazyPrivacy,
  LazyTerms,
  LazyDocs,
  LazyAccountDeletion,
  LazyHealth,
  LazyProcessesHome,
  LazyProcessDetail,
  LazyAdLanding,
  LazyAdLanding2,
  LazyOnboardingMobile,
  LazyBlog,
  LazyBlogPost,
  LazyAcademy,
  LazyAcademyPath,
  LazyAcademyLesson,
  LazyLinearDashboard,
  LazyLinearTasks,
  LazyLinearGoals,
  LazyLinearMetrics,
  LazyLinearIssues,
  LazyLinearMeetings,
  LazyLinearPeople,
  LazyLinearOrgChart,
  LazyLinearOrgHealth,
  LazyLinearStrategy,
  LazyLinearZentrixAI,
  LazyLinearAcademy,
  LazyCompanyMobile,
  LazyDashboardV1Bento,
  LazyDashboardV2Kanban,
  LazyDashboardV3Timeline,
  LazyDashboardV4Magazine,
  LazyDashboardV5Compact,
  LazyDashboardV6Cards,
  LazyDashboardV7Split,
  LazyDashboardV8Metrics,
  LazyDashboardV9Focus,
  LazyDashboardV10Executive,
  LazyCompDashboard,
  LazyCompTasks,
  LazyCompGoals,
  LazyCompMetrics,
  LazyMeetingV2,
  LazyVTOBuilder,
} from "@/utils/lazyRoutes";

// Academy pages now imported from lazyRoutes (with retry support)
import { OnboardingDemo } from "./pages/OnboardingDemo";
import { OnboardingVariantRouter } from "@/components/onboarding/OnboardingVariantRouter";
import { PendingJoinTokenRedirector } from "@/components/auth/PendingJoinTokenRedirector";
import { ErrorButton } from "@/components/debug/ErrorButton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes (increased from 10)
      gcTime: 60 * 60 * 1000, // 60 minutes (increased from 30)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: 1
    }
  }
});

import { logger } from '@/utils/logger';
import { captureAttribution } from '@/utils/marketingAttribution';

// Capture marketing attribution params on first load
captureAttribution();

// Unregister any previously installed service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach(r => r.unregister());
  });
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CommandPaletteProvider>
        <KeyboardShortcutsProvider>
          <OptimizedProviders>
            <AppLoadingProvider>
              <NavigationTransitionProvider>
                <MeetingEndStateProvider>
                  <OptimisticMeetingEndProvider>
                    <TooltipProvider>
                      {/* System-wide announcement banner for all pages */}
                      <SystemAnnouncementBanner />
                      <Sonner />
                      <NetworkToast />

                      <ErrorButton />
                       <BrowserRouter>
              <AppErrorBoundary>
              <SessionAnalyticsProvider>
              <MobileRouteGuard>
              <RouteHistoryTracker />
              <GA4RouteTracker />
              <PerformancePreloader />
              <LoginTracker />
              <ActivityTracker />
              <CommandPalette />
              <KeyboardShortcutsModal />
              {/* Onboarding spotlight tours mount once here (outside the
                  per-route AppLayout) so the overlay stays alive across
                  step navigation. Inside AppLayout, it would unmount on
                  every route change and the page would flash dim/un-dim. */}
              <OnboardingVariantRouter />
              <PendingJoinTokenRedirector />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing3 />} />
              {/* OAuth popup result page — the integrations-oauth-callback
                  edge function 302-redirects here with the outcome encoded
                  as query params. Public so the popup loads without auth. */}
              <Route path="/oauth-result" element={<OAuthResult />} />
              <Route path="/home-original" element={<Index />} />
              <Route path="/home2" element={
                <PageSuspense>
                  <LazyHome2 />
                </PageSuspense>
              } />
              <Route path="/home3" element={
                <PageSuspense>
                  <LazyHome3 />
                </PageSuspense>
              } />
              <Route path="/home4" element={
                <PageSuspense>
                  <LazyHome4 />
                </PageSuspense>
              } />
              <Route path="/home5" element={
                <PageSuspense>
                  <LazyHome5 />
                </PageSuspense>
              } />
              <Route path="/home6" element={
                <PageSuspense>
                  <LazyHome6 />
                </PageSuspense>
              } />
              <Route path="/home77" element={
                <PageSuspense>
                  <LazyHome77 />
                </PageSuspense>
              } />
              <Route path="/landing" element={<Landing />} />
              {/* NOTE: /landing2 route removed - unused page with pricing violating Apple compliance */}
              <Route path="/landing3" element={
                <PageSuspense>
                  <LazyHome4 />
                </PageSuspense>
              } />
              <Route path="/science" element={
                <PageSuspense>
                  <LazyScience />
                </PageSuspense>
              } />
              <Route path="/blog" element={
                <PageSuspense>
                  <LazyBlog />
                </PageSuspense>
              } />
              <Route path="/blog/:slug" element={
                <PageSuspense>
                  <LazyBlogPost />
                </PageSuspense>
              } />
              <Route path="/privacy" element={
                <PageSuspense>
                  <LazyPrivacy />
                </PageSuspense>
              } />
              <Route path="/terms" element={
                <PageSuspense>
                  <LazyTerms />
                </PageSuspense>
              } />
              <Route path="/docs" element={
                <PageSuspense>
                  <LazyDocs />
                </PageSuspense>
              } />
              <Route path="/account-deletion" element={
                <PageSuspense>
                  <LazyAccountDeletion />
                </PageSuspense>
              } />
              <Route path="/login" element={
                <PageSuspense>
                  <LazyLogin />
                </PageSuspense>
              } />
              <Route path="/m/login" element={
                <PageSuspense>
                  <LazyMobileLogin />
                </PageSuspense>
              } />
              <Route path="/signup" element={
                <PageSuspense>
                  <LazySignup />
                </PageSuspense>
              } />
              <Route path="/ad" element={
                <PageSuspense>
                  <LazyAdLanding />
                </PageSuspense>
              } />
              <Route path="/ad2" element={
                <PageSuspense>
                  <LazyAdLanding2 />
                </PageSuspense>
              } />
              <Route path="/onboardingmobile" element={
                <PageSuspense>
                  <LazyOnboardingMobile />
                </PageSuspense>
              } />
              <Route path="/vto-builder" element={
                <PageSuspense>
                  <LazyVTOBuilder />
                </PageSuspense>
              } />
              <Route path="/forgot-password" element={
                <PageSuspense>
                  <LazyForgotPassword />
                </PageSuspense>
              } />
              <Route path="/reset-password" element={
                <PageSuspense>
                  <LazyResetPassword />
                </PageSuspense>
              } />
              <Route path="/email-confirmation" element={
                <PageSuspense>
                  <LazyEmailConfirmation />
                </PageSuspense>
              } />
              <Route path="/auth/callback" element={
                <PageSuspense>
                  <LazyAuthCallback />
                </PageSuspense>
              } />
              <Route path="/email-verified" element={
                <PageSuspense>
                  <LazyEmailVerified />
                </PageSuspense>
              } />
              <Route path="/complete-invitation" element={
                <PageSuspense>
                  <LazyCompleteInvitation />
                </PageSuspense>
              } />
              <Route path="/accept-invitation" element={
                <PageSuspense>
                  <LazyAcceptInvitation />
                </PageSuspense>
              } />
              <Route path="/join/:token" element={
                <PageSuspense>
                  <LazyJoinViaLink />
                </PageSuspense>
              } />
              <Route path="/account-deactivated" element={
                <PageSuspense>
                  <LazyAccountDeactivated />
                </PageSuspense>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyOnboarding />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/new-company" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyNewCompany />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/onboarding-demo" element={<OnboardingDemo />} />

              {/* Protected application pages with sidebar layout */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <InvitationChecker />
                        <LazyDashboard />
                      </RouteErrorBoundary>
                    </AppLayout>
                  </PageSuspense>
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <InvitationChecker />
                        <LazyTasks2 />
                      </RouteErrorBoundary>
                    </AppLayout>
                  </PageSuspense>
                </ProtectedRoute>
              } />
              <Route path="/tasks2" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyTasks />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tasks3" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyTasks3 />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/m/tasks" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyTasksMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/goals" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyGoals />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/m/goals" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyGoalsMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/issues" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyIssues />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/m/issues" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyIssuesMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/metrics" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <InvitationChecker />
                      <PageSuspense>
                        <LazyMetrics />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/newmetrics" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <InvitationChecker />
                      <PageSuspense>
                        <LazyNewMetrics />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/m/metrics" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMetricsMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/analytics" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyAnalyticsMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/org-chart" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyOrgChartMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/meeting/:teamId" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMeetingMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/meeting/:teamId/:meetingType" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMeetingMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/company" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyCompanyMobile />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/m/settings" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMobileSettings />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/processes" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyProcessesHome />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/processes/:processId" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyProcessDetail />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/meetings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyMeetings />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/meeting/custom/builder" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <MeetingBuilder />
                  </PageSuspense>
                </ProtectedRoute>
              } />
              <Route path="/people" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyPeople />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/partner_hub" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <InvitationChecker />
                        <LazyPartnerHub />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/partner-hub" element={<Navigate to="/partner_hub" replace />} />
              <Route path="/process" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyProcess />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/process2" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyProcess2 />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/strategy" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense fallback={null}>
                        <LazyStrategy />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/org-chart" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyOrgChart />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/health" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyHealth />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tools" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyTools />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tools/delegate-elevate" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyDelegateElevate />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tools/clarity-break" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyClarityBreakJournal />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clarity-break" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyClarityBreakJournal />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              {/* Redirect old URL to new URL */}
              <Route path="/zentrix-ai" element={<Navigate to="/zentrixai" replace />} />
              <Route path="/zentrixai" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyAIThoughtPartner />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/academy" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyAcademy />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/academy/:pathSlug" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyAcademyPath />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/academy/:pathSlug/:lessonSlug" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyAcademyLesson />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/permissions" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyPermissions />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/testing" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyTesting />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/sidebar-test" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <LazySidebarTest />
                  </PageSuspense>
                </ProtectedRoute>
              } />
              <Route path="/speed" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <PageSuspense>
                          <LazySpeedTest />
                        </PageSuspense>
                      </RouteErrorBoundary>
                    </AppLayout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyProfile />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyAnalytics />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazySettings />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* SOPs routes */}
              <Route path="/sops" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazySopsLayout />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              }>
                <Route index element={<LazySopsHome />} />
                <Route path="templates" element={<LazySopsTemplates />} />
                <Route path="space/:spaceId" element={<LazySopsSpace />} />
                <Route path="page/:pageId" element={<LazySopsPage />} />
              </Route>
              
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyNotificationCenter />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/rls" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyOptimizedRLSManagement />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/rls2" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazySimpleRLS />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/rls3" element={
                <ProtectedRoute>
                  <AppLayout>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyDataAccessAnalyzer />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <PageSuspense>
                          <LazyAdminPanel />
                        </PageSuspense>
                      </RouteErrorBoundary>
                    </AppLayout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />
              <Route path="/company-management" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <PageSuspense>
                          <LazyCompanyManagement />
                        </PageSuspense>
                      </RouteErrorBoundary>
                    </AppLayout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />
              <Route path="/platform-usage" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <AppLayout>
                      <RouteErrorBoundary>
                        <PageSuspense>
                          <LazyPlatformUsage />
                        </PageSuspense>
                      </RouteErrorBoundary>
                    </AppLayout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />
              <Route path="/internal" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <RouteErrorBoundary>
                      <PageSuspense>
                        <LazyInternalDashboard />
                      </PageSuspense>
                    </RouteErrorBoundary>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />
              
              {/* Checkout page */}
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyCheckout />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              
              {/* Meeting routes */}
              <Route path="/meeting/:teamId" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMeeting />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/meeting/:teamId/:meetingType" element={
                <ProtectedRoute>
                  <RouteErrorBoundary>
                    <PageSuspense>
                      <LazyMeeting />
                    </PageSuspense>
                  </RouteErrorBoundary>
                </ProtectedRoute>
              } />
              
              {/* Prototype routes - public, no auth */}
              <Route path="/prototype/linear-dashboard" element={
                <PageSuspense>
                  <LazyLinearDashboard />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-tasks" element={
                <PageSuspense>
                  <LazyLinearTasks />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-goals" element={
                <PageSuspense>
                  <LazyLinearGoals />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-metrics" element={
                <PageSuspense>
                  <LazyLinearMetrics />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-issues" element={
                <PageSuspense>
                  <LazyLinearIssues />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-meetings" element={
                <PageSuspense>
                  <LazyLinearMeetings />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-people" element={
                <PageSuspense>
                  <LazyLinearPeople />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-org-chart" element={
                <PageSuspense>
                  <LazyLinearOrgChart />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-org-health" element={
                <PageSuspense>
                  <LazyLinearOrgHealth />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-strategy" element={
                <PageSuspense>
                  <LazyLinearStrategy />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-zentrix-ai" element={
                <PageSuspense>
                  <LazyLinearZentrixAI />
                </PageSuspense>
              } />
              <Route path="/prototype/linear-academy" element={
                <PageSuspense>
                  <LazyLinearAcademy />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v1" element={
                <PageSuspense>
                  <LazyDashboardV1Bento />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v2" element={
                <PageSuspense>
                  <LazyDashboardV2Kanban />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v3" element={
                <PageSuspense>
                  <LazyDashboardV3Timeline />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v4" element={
                <PageSuspense>
                  <LazyDashboardV4Magazine />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v5" element={
                <PageSuspense>
                  <LazyDashboardV5Compact />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v6" element={
                <PageSuspense>
                  <LazyDashboardV6Cards />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v7" element={
                <PageSuspense>
                  <LazyDashboardV7Split />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v8" element={
                <PageSuspense>
                  <LazyDashboardV8Metrics />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v9" element={
                <PageSuspense>
                  <LazyDashboardV9Focus />
                </PageSuspense>
              } />
              <Route path="/prototype/dashboard-v10" element={
                <PageSuspense>
                  <LazyDashboardV10Executive />
                </PageSuspense>
              } />
              <Route path="/prototype/comp-dashboard" element={
                <PageSuspense>
                  <LazyCompDashboard />
                </PageSuspense>
              } />
              <Route path="/prototype/comp-tasks" element={
                <PageSuspense>
                  <LazyCompTasks />
                </PageSuspense>
              } />
              <Route path="/prototype/comp-goals" element={
                <PageSuspense>
                  <LazyCompGoals />
                </PageSuspense>
              } />
              <Route path="/prototype/comp-metrics" element={
                <PageSuspense>
                  <LazyCompMetrics />
                </PageSuspense>
              } />

              {/* Prototype: Meeting V2 with unified Zustand store */}
              <Route path="/prototype/meeting/:teamId" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <LazyMeetingV2 />
                  </PageSuspense>
                </ProtectedRoute>
              } />
              <Route path="/prototype/meeting/:teamId/:meetingType" element={
                <ProtectedRoute>
                  <PageSuspense>
                    <LazyMeetingV2 />
                  </PageSuspense>
                </ProtectedRoute>
              } />

              {/* Theme picker - public */}
              <Route path="/theme-picker" element={
                <PageSuspense>
                  <LazyThemePicker />
                </PageSuspense>
              } />

              {/* Catch-all 404 route - MUST be last */}
              <Route path="*" element={
                <PageSuspense>
                  <LazyNotFound />
                </PageSuspense>
              } />
            </Routes>
              </MobileRouteGuard>
              </SessionAnalyticsProvider>
          </AppErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
          </OptimisticMeetingEndProvider>
        </MeetingEndStateProvider>
      </NavigationTransitionProvider>
      </AppLoadingProvider>
    </OptimizedProviders>
    </KeyboardShortcutsProvider>
    </CommandPaletteProvider>
  </QueryClientProvider>
  );
};

export default App;
