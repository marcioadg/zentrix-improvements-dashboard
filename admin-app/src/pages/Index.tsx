import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiCompany } from "@/contexts/MultiCompanyContext";
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Brain,
  Rocket,
  Star,
  ChevronDown,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { logger } from '@/utils/logger';

const Index = () => {
  // PRIORITY 1: Check for password recovery FIRST (before any auth checks)
  // This must happen before useAuth to prevent race conditions
  const hash = window.location.hash;
  const searchParams = window.location.search;
  const isRecoveryFlow = hash.includes("type=recovery") || searchParams.includes("type=recovery");

  // If recovery flow detected, redirect immediately with hash preserved
  if (isRecoveryFlow) {
    logger.log("🔐 Index: Recovery flow detected in hash/search, redirecting to /reset-password");
    return <Navigate to={`/reset-password${hash}`} replace />;
  }

  const { user, loading, signOut } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompany();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("operational");
  const [showVersionBanner, setShowVersionBanner] = useState(false);
  const [activeSubTopic, setActiveSubTopic] = useState({
    operational: "meetings",
    strategic: "goals",
    talent: "org-chart",
    intelligence: "dashboards",
  });
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Version check
  useEffect(() => {
    const checkVersion = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("system_version")
        .eq("setting_key", "app_version")
        .single();

      if (data?.system_version && data.system_version !== "1.2") {
        setShowVersionBanner(true);
      }
    };
    checkVersion();
  }, []);

  // Forward Supabase signup hash to email-confirmation to avoid early dashboard redirects
  useEffect(() => {
    try {
      if (window.location.pathname === "/" && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const type = params.get("type");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        // Check for password recovery first - redirect to /reset-password with hash intact
        if (type === "recovery" && (accessToken || refreshToken)) {
          logger.log("🔐 Index: Recovery link detected, redirecting to /reset-password");
          const target = `${window.location.origin}/reset-password${window.location.hash}`;
          window.location.replace(target);
          return;
        }

        // Then check for signup
        if (type === "signup" && (accessToken || refreshToken)) {
          const qs = new URLSearchParams();
          ["access_token", "refresh_token", "type", "token_type"].forEach((k) => {
            const v = params.get(k);
            if (v) qs.set(k, v);
          });
          const target = `${window.location.origin}/email-confirmation?${qs.toString()}`;
          window.location.replace(target);
        }
      }
    } catch (e) {
      logger.warn("Index: hash forward failed (non-blocking)", e);
    }
  }, []);
  const handleSignOut = async () => {
    try {
      logger.log("🔴 Index: Sign out button clicked");

      // Clean up auth state first
      const cleanupAuthState = () => {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
            sessionStorage.removeItem(key);
          }
        });
      };
      cleanupAuthState();

      // Attempt global sign out (ignore errors)
      try {
        await signOut();
        logger.log("✅ Index: Sign out successful");
      } catch (error) {
        logger.log("ℹ️ Index: Sign out had issues but continuing:", error);
      }

      // Force page reload for clean state
      window.location.href = "/";
    } catch (error) {
      logger.error("❌ Index: Sign out error:", error);
      // Even if there's an error, try to clean up and reload
      window.location.href = "/";
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center tesla-cinematic">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tesla-blue"></div>
      </div>
    );
  }

  // Authenticated user - redirect based on company status
  // Note: Recovery flow is already handled at the top of the component
  if (user && !isRecoveryFlow) {
    // Wait for company data to load
    if (companyLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center tesla-cinematic">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tesla-blue"></div>
        </div>
      );
    }

    // User has no company → onboarding
    if (!currentCompany) {
      logger.log("🔄 Index: No company found, redirecting to onboarding");
      return <Navigate to="/onboarding" replace />;
    }

    // User has company → dashboard
    logger.log("✅ Index: User authenticated with company, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Non-authenticated user - full cinematic homepage
  return (
    <div className="tesla-cinematic overflow-hidden">
      {/* Version Banner - Small Popup */}
      {showVersionBanner && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">New version available</p>
              <p className="text-xs text-muted-foreground">Please refresh to get the latest updates.</p>
              <Button onClick={() => window.location.reload()} size="sm" className="w-full">
                Refresh Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Header />
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center tesla-bg-hero relative tesla-grid-overlay">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tesla-black/20 to-tesla-black/40"></div>

        <div className="relative z-10 px-6 max-w-7xl mx-auto">
          {/* Centered badge above everything */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Copy */}
            <div className="tesla-animate-fade-up">
              <div className="mb-6 tesla-delay-150">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tesla-text-gradient-blue tesla-delay-200 leading-tight">
                  Your Business. One Platform. Zero Chaos.
                </h1>
              </div>

              <p className="text-xs text-tesla-light-gray mb-10 leading-relaxed tesla-delay-300">
                Everything you need to run, scale, and optimize your business—from strategy to execution, people to
                processes—all in one intelligent operating system.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-4 tesla-delay-400">
                <Link
                  to="/signup"
                  className="tesla-button-primary inline-flex items-center px-6 py-3 text-base font-semibold rounded-xl group"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Column - Product Screenshots */}
            <div className="tesla-animate-fade-up tesla-delay-300 relative">
              <div className="relative transform scale-110 lg:scale-125">
                <img
                  src="/lovable-uploads/zentrix-dashboard-mockup.png"
                  alt="Zentrix OS Dashboard - Complete business metrics and goals tracking interface showing laptop and mobile views"
                  className="w-full h-auto rounded-2xl shadow-2xl tesla-glow-blue"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-tesla-black/10 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Stats - Moved after Hero */}
      <section className="-mt-20 pt-0 pb-4 tesla-bg-gradient-blue relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 tesla-glass-card p-8">
            {[
              {
                stat: "2.3x",
                label: "Average Revenue Growth",
                color: "text-tesla-blue",
                glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]",
              },
              {
                stat: "67%",
                label: "Increase in Team Efficiency",
                color: "text-tesla-green",
                glow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]",
              },
              {
                stat: "$3,200",
                label: "Average Monthly Tool Savings",
                color: "text-tesla-white",
                glow: "hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]",
              },
              {
                stat: "89%",
                label: "Customer Satisfaction Score",
                color: "text-tesla-blue",
                glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]",
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`text-center p-4 rounded-xl transition-all duration-500 ease-out cursor-pointer group
                  hover:scale-110 hover:bg-tesla-black/20 hover:border border-tesla-white/10
                  ${item.glow} animate-fade-in`}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: "both",
                }}
              >
                <div
                  className={`text-3xl font-bold mb-2 transition-all duration-300 group-hover:scale-125 
                  tesla-text-gradient-blue group-hover:${item.color}`}
                >
                  {item.stat}
                </div>
                <div
                  className="text-xs text-tesla-light-gray transition-all duration-300 
                  group-hover:text-tesla-white transform group-hover:-translate-y-1"
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Stop Juggling Tools - Interactive Tabs */}
      <section className="min-h-screen flex items-center tesla-bg-gradient-blue py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="tesla-text-display tesla-text-gradient-blue mb-6">Stop Juggling 12 Different Tools</h2>
            <p className="text-sm md:text-base text-tesla-light-gray max-w-4xl mx-auto mb-12">
              Most growing businesses waste 2+ hours daily switching between disconnected apps, losing critical insights
              in the chaos. Zentrix OS consolidates your entire business into one seamless platform where every decision
              is data-driven and every team member stays aligned.
            </p>
          </div>

          {/* Interactive Tabs */}
          <div className="tesla-glass-card p-8">
            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {[
                {
                  id: "operational",
                  label: "Operational Execution",
                  icon: Settings,
                },
                {
                  id: "strategic",
                  label: "Strategic Planning",
                  icon: Target,
                },
                {
                  id: "talent",
                  label: "Talent Development",
                  icon: Users,
                },
                {
                  id: "intelligence",
                  label: "Business Intelligence",
                  icon: BarChart3,
                },
              ].map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${activeTab === tab.id ? "text-tesla-blue border-b-2 border-tesla-blue bg-transparent" : "bg-tesla-black/20 text-tesla-light-gray hover:bg-tesla-black/40"}`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeTab === "operational" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left - Title, Subtopics and Content */}
                  <div>
                    <h4 className="text-xl font-semibold text-tesla-white mb-8">
                      Turn Plans into Results with Organized Execution
                    </h4>

                    {/* Clickable Subtopics */}
                    <div className="space-y-4 mb-8">
                      {[
                        {
                          id: "meetings",
                          label: "Run structured, outcome-driven meetings",
                          active: activeSubTopic.operational === "meetings",
                        },
                        {
                          id: "tasks",
                          label: "Set, prioritize, and complete critical work",
                          active: activeSubTopic.operational === "tasks",
                        },
                        {
                          id: "processes",
                          label: "Document and access core processes",
                          active: activeSubTopic.operational === "processes",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setActiveSubTopic((prev) => ({
                              ...prev,
                              operational: item.id,
                            }))
                          }
                          className={`max-w-sm text-left px-3 py-2 rounded-lg transition-all duration-300 ${item.active ? "bg-tesla-blue/20 text-tesla-blue border-2 border-tesla-blue/50 shadow-lg" : "bg-tesla-black/20 text-tesla-light-gray border-2 border-transparent hover:bg-tesla-black/40 hover:border-tesla-blue/50"}`}
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right - Images */}
                  <div className="tesla-glass-card p-8 flex items-center justify-center min-h-[400px]">
                    {activeSubTopic.operational === "meetings" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Meeting management interface"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.operational === "tasks" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Task management dashboard"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.operational === "processes" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Process documentation system"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === "strategic" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left - Title, Subtopics and Content */}
                  <div>
                    <h4 className="text-xl font-semibold text-tesla-white mb-8">
                      Align Your Organization Around Strategic Goals
                    </h4>

                    {/* Clickable Subtopics */}
                    <div className="space-y-4 mb-8">
                      {[
                        {
                          id: "goals",
                          label: "Set ambitious goals and track progress",
                          active: activeSubTopic.strategic === "goals",
                        },
                        {
                          id: "planning",
                          label: "Use proven strategic planning frameworks",
                          active: activeSubTopic.strategic === "planning",
                        },
                        {
                          id: "decisions",
                          label: "Make data-driven strategic decisions",
                          active: activeSubTopic.strategic === "decisions",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setActiveSubTopic((prev) => ({
                              ...prev,
                              strategic: item.id,
                            }))
                          }
                          className={`max-w-sm text-left px-3 py-2 rounded-lg transition-all duration-300 ${item.active ? "bg-tesla-blue/20 text-tesla-blue border-2 border-tesla-blue/50 shadow-lg" : "bg-tesla-black/20 text-tesla-light-gray border-2 border-transparent hover:bg-tesla-black/40 hover:border-tesla-blue/50"}`}
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right - Images */}
                  <div className="tesla-glass-card p-8 flex items-center justify-center min-h-[400px]">
                    {activeSubTopic.strategic === "goals" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Goal tracking dashboard"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.strategic === "planning" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Strategic planning tools"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.strategic === "decisions" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Decision making framework"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === "talent" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left - Title, Subtopics and Content */}
                  <div>
                    <h4 className="text-xl font-semibold text-tesla-white mb-8">Build High-Performing Teams</h4>

                    {/* Clickable Subtopics */}
                    <div className="space-y-4 mb-8">
                      {[
                        {
                          id: "org-chart",
                          label: "Visualize organizational structure",
                          active: activeSubTopic.talent === "org-chart",
                        },
                        {
                          id: "performance",
                          label: "Manage performance and development",
                          active: activeSubTopic.talent === "performance",
                        },
                        {
                          id: "analytics",
                          label: "Analyze team dynamics and engagement",
                          active: activeSubTopic.talent === "analytics",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setActiveSubTopic((prev) => ({
                              ...prev,
                              talent: item.id,
                            }))
                          }
                          className={`max-w-sm text-left px-3 py-2 rounded-lg transition-all duration-300 ${item.active ? "bg-tesla-blue/20 text-tesla-blue border-2 border-tesla-blue/50 shadow-lg" : "bg-tesla-black/20 text-tesla-light-gray border-2 border-transparent hover:bg-tesla-black/40 hover:border-tesla-blue/50"}`}
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right - Images */}
                  <div className="tesla-glass-card p-8 flex items-center justify-center min-h-[400px]">
                    {activeSubTopic.talent === "org-chart" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Organizational chart interface"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.talent === "performance" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Performance management dashboard"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.talent === "analytics" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="People analytics dashboard"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === "intelligence" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left - Title, Subtopics and Content */}
                  <div>
                    <h4 className="text-xl font-semibold text-tesla-white mb-8">
                      Make Data-Driven Decisions with Confidence
                    </h4>

                    {/* Clickable Subtopics */}
                    <div className="space-y-4 mb-8">
                      {[
                        {
                          id: "dashboards",
                          label: "Monitor performance with real-time dashboards",
                          active: activeSubTopic.intelligence === "dashboards",
                        },
                        {
                          id: "reporting",
                          label: "Generate automated insights and reports",
                          active: activeSubTopic.intelligence === "reporting",
                        },
                        {
                          id: "predictions",
                          label: "Leverage AI for predictive analytics",
                          active: activeSubTopic.intelligence === "predictions",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setActiveSubTopic((prev) => ({
                              ...prev,
                              intelligence: item.id,
                            }))
                          }
                          className={`max-w-sm text-left px-3 py-2 rounded-lg transition-all duration-300 ${item.active ? "bg-tesla-blue/20 text-tesla-blue border-2 border-tesla-blue/50 shadow-lg" : "bg-tesla-black/20 text-tesla-light-gray border-2 border-transparent hover:bg-tesla-black/40 hover:border-tesla-blue/50"}`}
                        >
                          <div className="text-sm font-medium">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right - Images */}
                  <div className="tesla-glass-card p-8 flex items-center justify-center min-h-[400px]">
                    {activeSubTopic.intelligence === "dashboards" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Real-time dashboards interface"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.intelligence === "reporting" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Automated reporting dashboard"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                    {activeSubTopic.intelligence === "predictions" && (
                      <img
                        src="/lovable-uploads/zentrix-dashboard-mockup.png"
                        alt="Predictive analytics interface"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Feature Badges - Fixed at bottom */}
            <div className="flex flex-wrap justify-center gap-4 mt-12 pt-8 border-t border-tesla-white/10">
              <div className="inline-flex items-center px-4 py-2 tesla-glass rounded-full text-tesla-light-gray text-xs font-medium">
                <BarChart3 className="w-3 h-3 mr-2 text-tesla-blue" />
                Complete Visibility
              </div>
              <div className="inline-flex items-center px-4 py-2 tesla-glass rounded-full text-tesla-light-gray text-xs font-medium">
                <Target className="w-3 h-3 mr-2 text-tesla-green" />
                Perfect Alignment
              </div>
              <div className="inline-flex items-center px-4 py-2 tesla-glass rounded-full text-tesla-light-gray text-xs font-medium">
                <Zap className="w-3 h-3 mr-2 text-tesla-white" />
                Lightning Fast
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Start Small. Scale Infinitely */}
      <section className="min-h-screen flex items-center tesla-bg-primary py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="tesla-text-display tesla-text-gradient-green mb-8">Start Small. Scale Infinitely.</h2>
              <p className="tesla-text-subheading text-tesla-light-gray mb-8">
                Whether you're a solo founder planning your first hire or leading 300+ people across multiple locations,
                Zentrix OS grows with your ambition. Our multi-company support and advanced permissions ensure you never
                outgrow the platform.
              </p>
              <div className="space-y-6">
                {[
                  "Multi-company management",
                  "Advanced team permissions and roles",
                  "Real-time collaboration at any scale",
                  "Enterprise-grade security and compliance",
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-tesla-green rounded-full mr-4"></div>
                    <span className="tesla-text-body text-tesla-light-gray">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="tesla-glass-card p-12 text-center">
              <div className="text-6xl font-bold tesla-text-gradient-green mb-4">1→∞</div>
              <p className="tesla-text-subheading text-tesla-light-gray">People. Infinite Scale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: AI That Actually Knows Your Business */}
      <section className="min-h-screen flex items-center tesla-bg-gradient-blue py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="tesla-text-display tesla-text-gradient-blue mb-8">AI That Actually Knows Your Business</h2>
              <p className="tesla-text-subheading text-tesla-light-gray mb-8">
                Get personalized insights, automated priorities, and strategic recommendations that understand your
                context, not just your data. Our AI Thought Partner helps you make better decisions faster.
              </p>

              <div className="space-y-6 mb-12">
                {[
                  "Strategic conversation partner for complex business challenges",
                  "Automated insights based on your unique business patterns",
                  "Intelligent recommendations that evolve with your growth",
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-tesla-blue rounded-full mr-4 mt-2"></div>
                    <span className="tesla-text-body text-tesla-light-gray">{item}</span>
                  </div>
                ))}
              </div>

              <div className="tesla-glass-card p-6 border-l-4 border-tesla-blue">
                <p className="tesla-text-body text-tesla-white italic mb-3">
                  "Zentrix's AI helped us identify our biggest growth bottleneck in our first week. Revenue increased
                  34% in 90 days."
                </p>
                <div className="tesla-text-body text-tesla-light-gray text-sm">
                  — Bruno Barreta, Division Manager, Wisenetix
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="tesla-glass-card p-16">
                <Brain className="w-32 h-32 mx-auto mb-8 tesla-text-gradient-blue" />
                <h3 className="tesla-text-headline font-semibold text-tesla-white mb-4">AI Thought Partner</h3>
                <p className="tesla-text-body text-tesla-light-gray">
                  Strategic insights and recommendations that understand your unique business context
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Professional Tools for Every Challenge */}
      <section className="min-h-screen flex items-center tesla-bg-primary py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="tesla-text-display tesla-text-gradient-green mb-8">
              Professional Tools for Every Challenge
            </h2>
            <p className="tesla-text-subheading text-tesla-light-gray mb-12 max-w-4xl mx-auto">
              Access battle-tested frameworks from the world's best business thinkers—all integrated into your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Delegate & Elevate",
                desc: "Organize tasks using the proven love vs. skill matrix for optimal team performance.",
              },
              {
                title: "Clarity Break",
                desc: "Guided reflection and problem-solving journal to maintain sharp decision-making.",
              },
              {
                title: "Deep Strategy",
                desc: "Business strategy diagnosis and sharpening using proven methodologies.",
              },
              {
                title: "Marketing Strategy",
                desc: "Generate leads using the $100M Leads framework integrated into your workflow.",
              },
              {
                title: "The Offer",
                desc: "Create irresistible offers using the $100M Offers methodology.",
              },
              {
                title: "EOS Life",
                desc: "Personal life management system to maintain peak performance.",
              },
              {
                title: "Replacement Ladder",
                desc: "Succession planning and team development for sustainable growth.",
              },
              {
                title: "Health Tracking",
                desc: "Personal wellness monitoring because your business health starts with you.",
              },
            ].map((item, index) => (
              <div key={index} className="tesla-glass-card p-6 tesla-card-hover">
                <h3 className="tesla-text-subheading font-semibold text-tesla-white mb-3">{item.title}</h3>
                <p className="tesla-text-body text-tesla-light-gray text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Trusted by Growth-Focused Leaders */}
      <section className="min-h-screen flex items-center tesla-bg-gradient-blue py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="tesla-text-display tesla-text-gradient-blue mb-8">Trusted by Growth-Focused Leaders</h2>
            <p className="tesla-text-subheading text-tesla-light-gray max-w-3xl mx-auto">
              Join thousands of founders and executives who've streamlined their operations and accelerated their
              growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                quote:
                  "We went from chaos to clarity in 30 days. Our team efficiency increased 67% and we hit our annual goal in 8 months.",
                author: "Marcio Goncalves",
                role: "Founder & CEO at WiseVAs",
              },
              {
                quote:
                  "Zentrix replaced 8 different tools and saved us $3,200/month. More importantly, we finally have complete visibility into our business.",
                author: "Amanda Colaco",
                role: "General Manager at Wisenetix",
              },
              {
                quote:
                  "The AI insights are incredible. It's like having a strategic consultant available 24/7 who knows every detail of our business.",
                author: "Iana Ferreira",
                role: "Head of Marketing at Wise Scale",
              },
            ].map((testimonial, index) => (
              <div key={index} className="tesla-glass-card p-8 tesla-card-hover">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-tesla-blue fill-current" />
                  ))}
                </div>
                <blockquote className="tesla-text-body text-tesla-white mb-6 italic">"{testimonial.quote}"</blockquote>
                <div>
                  <div className="tesla-text-body font-semibold text-tesla-white">{testimonial.author}</div>
                  <div className="tesla-text-body text-tesla-light-gray text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Final CTA */}
      <section className="min-h-screen flex items-center tesla-bg-primary py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="tesla-text-display tesla-text-gradient-green mb-8">See Your Business Transform in 30 Days</h2>
          <p className="tesla-text-subheading text-tesla-light-gray mb-12">
            Start your free trial today. No credit card required. If you don't see dramatic improvements in your
            business clarity and team efficiency within 30 days, we'll help you transition back to your old system—for
            free.
          </p>

          <div className="tesla-glass-card p-12 mb-12">
            <Shield className="w-16 h-16 mx-auto mb-6 text-tesla-green" />
            <h3 className="tesla-text-headline font-semibold text-tesla-white mb-4">30-Day Results Guarantee</h3>
            <p className="tesla-text-body text-tesla-light-gray mb-8">
              We're so confident Zentrix OS will transform your business that we guarantee measurable improvements in 30
              days or we'll provide a full refund plus transition assistance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                to="/signup"
                className="tesla-button-primary inline-flex items-center px-8 py-4 text-lg font-semibold rounded-xl group"
              >
                Start Your Free Trial Now
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/signup" className="tesla-button-secondary px-8 py-4 text-lg font-medium rounded-xl">
                Schedule a Personal Demo
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-tesla-light-gray">
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-tesla-green rounded-full mr-2"></div>
                No credit card required
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-tesla-green rounded-full mr-2"></div>
                30-day money-back guarantee
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-tesla-green rounded-full mr-2"></div>
                White-glove onboarding included
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-tesla-green rounded-full mr-2"></div>
                Cancel anytime
              </div>
            </div>
          </div>

          <p className="tesla-text-body text-tesla-light-gray">Trusted by hundreds of growing businesses worldwide</p>
        </div>
      </section>

      {/* Sticky Footer CTA */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${isScrolled ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="tesla-glass border-t border-tesla-white/10 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-tesla-white">Ready to Transform Your Business?</h3>
              <p className="text-sm text-tesla-light-gray">Join the operating system revolution</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/signup"
                className="tesla-button-primary inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-lg group"
              >
                Launch Your Zentrix OS Today
                <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Index;
