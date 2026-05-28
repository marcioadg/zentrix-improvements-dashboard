import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  Target, 
  Rocket, 
  Brain,
  CheckCircle, 
  Star, 
  X,
  ChevronDown,
  Menu,
  Play,
  ArrowRight,
  Users,
  Zap,
  Shield,
  Globe,
  MessageSquare,
  Linkedin,
  Calendar
} from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.png";
import devices3d from '@/assets/devices-3d-updated.png';
import trustedLogo from '@/assets/trusted-logo.png';
import marcioAvatar from '@/assets/marcio-avatar.jpeg';
import amandaAvatar from '@/assets/amanda-avatar.jpeg';
import ianaAvatar from '@/assets/iana-avatar.jpeg';
import wisescaleLogo from '@/assets/wisescale-logo.png';

const Home4 = () => {
  const [faqOpen, setFaqOpen] = React.useState<number | null>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-page-bg text-white overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-page-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="text-xl font-bold text-white whitespace-nowrap">
                ZENTRIX OS
              </div>
              
              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center space-x-6">
                <button
                  onClick={() => scrollToSection('why-zentrix')}
                  className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Why Zentrix
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('testimonials')}
                  className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Testimonials
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection('faq')}
                  className="text-sm text-gray-300 hover:text-white transition-colors duration-200"
                >
                  FAQ
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="group hidden md:block">
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 group-hover:scale-105 transform transition-all duration-300">
                    Log in
                  </Button>
                </Link>
              </div>
              <div className="group hidden md:block">
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 group-hover:scale-105 transform transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-500/25">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
              <div className="md:hidden">
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                    Log in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Turn Business{" "}
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Chaos
                </span>{" "}
                Into Predictable Growth
              </h1>
              <p className="text-base text-gray-300 leading-relaxed max-w-2xl">
                Project management tools track tasks. Zentrix OS runs your entire business. 
                Get the clarity, alignment, and control you need to scale from $1M to $100M—without the chaos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="group flex flex-col">
                  <Link to="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 group-hover:scale-105 transform transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-500/25">
                      Start Your 30-Day Free Trial
                    </Button>
                  </Link>
                  <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[280px] whitespace-nowrap">
                    No credit card required • 5-minute setup • Cancel anytime
                  </p>
                </div>
              </div>
            </div>
            <div className="relative scale-125">
              <img 
                src={dashboardPreview} 
                alt="Dashboard preview showing multiple device views" 
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-transparent border-y border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-base text-white font-bold mb-3">Trusted by growth-focused companies</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 place-items-center gap-x-5 gap-y-6 max-w-[340px] mx-auto sm:max-w-4xl sm:flex sm:justify-center sm:items-center sm:gap-8">
            <img src={trustedLogo} alt="Company logo" className="h-12 sm:h-16 w-auto max-w-[140px] sm:max-w-[180px] object-contain opacity-70 hover:opacity-90 transition-opacity duration-300 filter grayscale" loading="lazy" decoding="async" />
            <img src="/lovable-uploads/6567db1f-7af4-4df8-9f02-9e9e6ec7d656.png" alt="Company logo" className="h-12 sm:h-16 w-auto max-w-[140px] sm:max-w-[180px] object-contain opacity-70 hover:opacity-90 transition-opacity duration-300 filter grayscale" loading="lazy" decoding="async" />
            <img src="/lovable-uploads/c1a5d477-5d1f-46e4-b513-0059aead9b06.png" alt="Company logo" className="h-12 sm:h-16 w-auto max-w-[140px] sm:max-w-[180px] object-contain opacity-70 hover:opacity-90 transition-opacity duration-300 filter grayscale" loading="lazy" decoding="async" />
            <img src={wisescaleLogo} alt="Wise Scale logo" className="h-12 sm:h-16 w-auto max-w-[140px] sm:max-w-[180px] object-contain opacity-70 hover:opacity-90 transition-opacity duration-300" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="why-zentrix" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Why Most Companies{" "}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Fail to Scale
              </span>
            </h2>
            <p className="text-secondary-foreground text-lg max-w-3xl mx-auto mt-4">
              It's not a lack of tools—it's a lack of clarity. Without a single source of truth, businesses drift into reactive chaos.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-16 max-w-5xl mx-auto">
            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-white border border-border rounded-xl p-6 hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">No clear direction</h3>
                  <p className="text-secondary-foreground text-sm leading-relaxed">Team doesn't know what to work on or why it matters</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-white border border-border rounded-xl p-6 hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">Accountability gaps</h3>
                  <p className="text-secondary-foreground text-sm leading-relaxed">No one owns outcomes, decisions get lost in Slack</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-white border border-border rounded-xl p-6 hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">Meeting waste</h3>
                  <p className="text-secondary-foreground text-sm leading-relaxed">Hours of discussion with zero documented decisions</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-white border border-border rounded-xl p-6 hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">Strategic drift</h3>
                  <p className="text-secondary-foreground text-sm leading-relaxed">Reacting to urgencies instead of executing the plan</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-white border border-border rounded-xl p-6 hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">Knowledge loss</h3>
                  <p className="text-secondary-foreground text-sm leading-relaxed">When key people leave, critical context disappears</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="transition-all duration-300 hover:bg-white rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">$2.1M</div>
              <p className="text-secondary-foreground text-sm font-bold group-hover:text-secondary-foreground transition-colors duration-300">Average annual cost of strategic<br />misalignment for mid-sized companies</p>
            </div>
            <div className="transition-all duration-300 hover:bg-white rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">67%</div>
              <p className="text-secondary-foreground text-sm font-bold group-hover:text-secondary-foreground transition-colors duration-300">Of employees don't understand<br />their company's strategy</p>
            </div>
            <div className="transition-all duration-300 hover:bg-white rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">3x slower</div>
              <p className="text-secondary-foreground text-sm font-bold group-hover:text-secondary-foreground transition-colors duration-300">Decision-making without clear<br />strategic frameworks and accountability</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
              One Platform. Total Control.{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Exponential Growth.
              </span>
            </h2>
          </div>
          <div className="sm:hidden space-y-3">
            {[
              ['Visibility', 'From scattered updates', 'To one source of truth'],
              ['Alignment', 'From teams guessing priorities', 'To goals everyone can see'],
              ['Execution', 'From decisions lost in meetings', 'To owners, dates, and outcomes'],
              ['Memory', 'From context leaving with people', 'To decisions preserved in Zentrix OS'],
            ].map(([label, before, after]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white mb-3">{label}</div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-xs leading-relaxed">
                  <div className="rounded-xl bg-white/[0.04] p-3 text-gray-300">{before}</div>
                  <div className="flex items-center text-purple-300"><ArrowRight className="h-4 w-4" /></div>
                  <div className="rounded-xl bg-purple-500/15 p-3 text-white font-medium">{after}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-popover/40 border border-gray-800/50 rounded-2xl p-8 hover:border-purple-500/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <BarChart3 className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Complete Visibility</h3>
                <p className="text-gray-300 text-sm leading-relaxed">See your entire business at a glance, not just task lists</p>
              </div>
            </div>
            
            <div className="group bg-popover/40 border border-gray-800/50 rounded-2xl p-8 hover:border-purple-500/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Target className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Strategic Alignment</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Every team and individual aligned to company goals</p>
              </div>
            </div>
            
            <div className="group bg-popover/40 border border-gray-800/50 rounded-2xl p-8 hover:border-purple-500/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Rocket className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Decision to Results</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Turn strategic decisions into measurable outcomes faster</p>
              </div>
            </div>
            
            <div className="group bg-popover/40 border border-gray-800/50 rounded-2xl p-8 hover:border-purple-500/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Brain className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Institutional Memory</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Preserve context and decisions that survive team changes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Deep Dive */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
              Built for Operators Who Run Businesses,{" "}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Not Just Projects
              </span>
            </h2>
            <p className="text-secondary-foreground text-lg max-w-3xl mx-auto">
              Project management software tracks tasks. Zentrix OS runs your business.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 border border-border hover:border-purple-500/40 hover:shadow-lg transition-all duration-300">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Business Intelligence Hub
              </h3>
              <p className="text-base text-secondary-foreground leading-relaxed mb-6">
                Get complete visibility into your business in one beautiful dashboard. 
                No more hunting through spreadsheets or jumping between apps to understand what's happening.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Consolidated KPI tracking across all departments</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Beautiful visualizations and progress tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Quick access to goals, metrics, and team performance</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 border border-border hover:border-purple-500/40 hover:shadow-lg transition-all duration-300">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Structured Meeting System
              </h3>
              <p className="text-base text-secondary-foreground leading-relaxed mb-6">
                Transform your meetings from time-wasters into results-generators. 
                Every discussion becomes documented decisions and trackable commitments.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Real-time collaborative note-taking and decision logging</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Action item creation with clear ownership</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Built-in accountability with tracking and follow-up</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 border border-border hover:border-purple-500/40 hover:shadow-lg transition-all duration-300">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Accountability Engine
              </h3>
              <p className="text-base text-secondary-foreground leading-relaxed mb-6">
                Lock in focus and discipline across your organization. With systematic goal-setting and team scorecards, every commitment turns into measurable progress.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Quarterly goal tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Weekly team accountability scorecards</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary-foreground shrink-0" />
                  <span className="text-secondary-foreground">Systematic issue identification and resolution process</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
              Real Results, Real Growth
            </h2>
            <p className="text-xl text-gray-300">See how companies like yours transformed their operations</p>
          </div>
          <div className="sm:hidden mb-8 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-4 text-left">
            <div className="text-xs uppercase tracking-[0.2em] text-purple-200 mb-3">Before → After</div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-black/20 p-3 text-gray-300">
                <span className="font-semibold text-white">Before:</span> decisions scattered across meetings, Slack, and spreadsheets.
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-white">
                <span className="font-semibold">After Zentrix OS:</span> every decision becomes visible ownership, follow-up, and measurable progress.
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-5 sm:p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-5 sm:mb-8">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 sm:mb-4">120hrs</div>
                <div className="text-sm text-muted-foreground font-medium">Monthly Time Saved</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-5 sm:mb-8 text-sm sm:text-base italic min-h-0 sm:min-h-[120px] sm:flex sm:items-center">
                "Zentrix OS gave us the clarity and alignment we were missing. Every team now knows exactly what to focus on — saving over 120 hours a month in meetings and rework."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <img 
                  src={amandaAvatar} 
                  alt="Amanda Colaco" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Amanda Colaco</div>
                  <div className="text-sm text-muted-foreground">General Manager at Wisenetix</div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-5 sm:p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-5 sm:mb-8">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 sm:mb-4">6</div>
                <div className="text-sm text-muted-foreground font-medium">Meetings Eliminated Weekly</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-5 sm:mb-8 text-sm sm:text-base italic min-h-0 sm:min-h-[120px] sm:flex sm:items-center">
                "Zentrix brought our entire team into alignment — for the first time, everyone's rowing in the same direction and we've eliminated six unnecessary meetings every week."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <img 
                  src={ianaAvatar} 
                  alt="Iana Ferreira" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Iana Ferreira</div>
                  <div className="text-sm text-muted-foreground">Head of Marketing at Wise Scale</div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-5 sm:p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-5 sm:mb-8">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 sm:mb-4">67%</div>
                <div className="text-sm text-muted-foreground font-medium">Team Efficiency Increase</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-5 sm:mb-8 text-sm sm:text-base italic min-h-0 sm:min-h-[120px] sm:flex sm:items-center">
                "We went from chaos to clarity in 30 days. Our team efficiency increased 67% and we hit our annual goal in 8 months."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <img 
                  src={marcioAvatar} 
                  alt="Marcio Gonçalves" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Marcio Gonçalves</div>
                  <div className="text-sm text-muted-foreground">Founder & CEO at WiseVAs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 bg-muted/50" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-secondary-foreground mb-8">Choose the plan that fits your growth stage</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Standard Plan - Most Popular */}
            <div className="bg-white border-2 border-purple-500 rounded-xl p-6 text-center shadow-lg transform scale-105 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3 text-foreground">Standard</h3>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">$5</div>
                <div className="text-secondary-foreground text-sm mb-1">per user per month</div>
                <div className="text-muted-foreground text-xs">Billed monthly</div>
              </div>
              <Link to="/signup" className="w-full">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-border rounded-xl p-6 text-center hover:border-purple-500 hover:shadow-md transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3 text-foreground">Enterprise</h3>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Custom</div>
                <div className="text-secondary-foreground text-sm mb-1">Contact us for pricing</div>
                <div className="text-muted-foreground text-xs">100+ users minimum</div>
              </div>
              <a href="mailto:matheus@zentrixventures.com" className="w-full">
                <Button className="w-full bg-muted border border-border text-secondary-foreground hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white hover:border-transparent transition-all duration-300">
                  Contact Sales
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="pt-3 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-12 max-w-4xl mx-auto">
            <div className="backdrop-blur-sm bg-transparent border-0 sm:border sm:border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">Results in 30 days or money back</h3>
              <p className="text-muted-foreground text-xs">We guarantee immediate results.</p>
            </div>
            <div className="backdrop-blur-sm bg-transparent border-0 sm:border sm:border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">Free tool migration</h3>
              <p className="text-muted-foreground text-xs">We handle all data migration.</p>
            </div>
            <div className="backdrop-blur-sm bg-transparent border-0 sm:border sm:border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">No lock-in contracts</h3>
              <p className="text-muted-foreground text-xs">Cancel anytime with full data export.</p>
            </div>
          </div>
          <div className="text-center space-y-6">
            <div className="mb-8">
              <p className="text-2xl font-semibold text-gray-200 max-w-3xl mx-auto">
                Project management software tracks tasks.{" "}
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Zentrix OS runs your business.
                </span>
              </p>
            </div>
            <div className="flex justify-center">
              <div className="group flex flex-col">
                <Link to="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 group-hover:scale-105 transform transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-500/25">
                    Start Your 30-Day Free Trial
                  </Button>
                </Link>
                <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-[280px] whitespace-nowrap">
                  No credit card required • 5-minute setup • Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-white">
              FAQ
            </h2>
          </div>
          <div className="space-y-2">
            {[
              {
                question: "How is Zentrix OS different from other business management platforms?",
                answer: "Unlike fragmented solutions, Zentrix OS is built as a unified operating system for businesses. It replaces 12+ tools with one intelligent platform that connects all your data, processes, and people."
              },
              {
                question: "How quickly can our team adopt the platform?",
                answer: "Most teams see immediate value within the first week. Our 5-minute setup and intelligent onboarding help you go from signup to productive use in under 30 minutes."
              },
              {
                question: "Can you migrate our data from existing tools?",
                answer: "Yes! We provide free data migration from all major business tools. Our team handles the heavy lifting so you can focus on running your business."
              },
              {
                question: "Is our data secure?",
                answer: "Security is our top priority. We're SOC 2 Type II certified, use enterprise-grade encryption, and offer GDPR compliance. Your data is always protected."
              },
              {
                question: "Can the platform scale with our growing business?",
                answer: "Absolutely. Zentrix OS is designed to scale from startups to enterprises. Our infrastructure automatically adapts to your team size and data volume."
              }
            ].map((faq, index) => (
              <div key={index} className="border-b border-gray-800 last:border-b-0">
                <button
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="w-full py-4 text-left flex items-center justify-between hover:text-purple-400 transition-colors"
                >
                  <span className="font-medium text-white text-sm">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${faqOpen === index ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === index && (
                  <div className="pb-4">
                    <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-popover py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-6">
            <div>
              <div className="flex items-center space-x-4 mt-4">
                <a 
                  href="https://www.linkedin.com/company/zentrixventures/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-3 text-white text-sm">Legal</h4>
              <div className="flex flex-col items-start space-y-2">
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Privacy Policy</a>
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Terms of Service</a>
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Cookie Policy</a>
                <a href="https://www.zentrixventures.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition-colors text-sm">Zentrix Ventures</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
              <div className="text-muted-foreground">
                © 2025 Zentrix OS. All rights reserved.
              </div>
              <div className="text-muted-foreground">
                Made with 🩶 for growth-obsessed leaders
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home4;