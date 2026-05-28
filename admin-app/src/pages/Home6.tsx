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
  Twitter,
  Linkedin,
  Github,
  Calendar
} from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.png";
import devices3d from '@/assets/devices-3d-updated.png';

const Home6 = () => {
  const [faqOpen, setFaqOpen] = React.useState<number | null>(null);
  const [isAnnual, setIsAnnual] = React.useState(true);

  const calculateStandardPrice = () => {
    return isAnnual ? 5 : 6; // $5 annual, $6 monthly (20% more)
  };

  return (
    <div className="min-h-screen bg-page-bg text-white overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-page-bg/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Zentrix OS
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="group">
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 group-hover:scale-105 transform transition-all duration-300">
                    Log in
                  </Button>
                </Link>
              </div>
              <div className="group">
                <Link to="/signup">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 group-hover:scale-105 transform transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-purple-500/25">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle mobile menu">
                <Menu className="h-5 w-5" />
              </Button>
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
                Replace your patchwork of 12+ disconnected tools with one intelligent operating system. 
                Get the clarity, control, and confidence to scale from $1M to $100M—without losing your mind.
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
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-base text-white font-bold mb-3">Trusted by growth-focused companies</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 max-w-2xl mx-auto">
            <img src="/lovable-uploads/7b61e3d0-0153-43c6-9631-1e9b54e06f52.png" alt="Company logo" className="h-16 w-auto max-w-[180px] object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 filter grayscale brightness-0 invert opacity-70 hover:opacity-90" loading="lazy" decoding="async" />
            <img src="/lovable-uploads/6567db1f-7af4-4df8-9f02-9e9e6ec7d656.png" alt="Company logo" className="h-16 w-auto max-w-[180px] object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 filter grayscale brightness-0 invert opacity-70 hover:opacity-90" loading="lazy" decoding="async" />
            <img src="/lovable-uploads/c1a5d477-5d1f-46e4-b513-0059aead9b06.png" alt="Company logo" className="h-16 w-auto max-w-[180px] object-contain opacity-90 hover:opacity-100 transition-opacity duration-300 filter grayscale brightness-0 invert opacity-70 hover:opacity-90" loading="lazy" decoding="async" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              The Hidden Cost of{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Business Complexity
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-16 max-w-5xl mx-auto">
            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-popover/40 border border-gray-800/50 rounded-xl p-6 hover:bg-popover/60 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 leading-tight">Monday chaos</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">47 browser tabs, 12 apps, zero clarity</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-popover/40 border border-gray-800/50 rounded-xl p-6 hover:bg-popover/60 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 leading-tight">Meeting overload</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">6 hours discussing with no documented outcomes</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-popover/40 border border-gray-800/50 rounded-xl p-6 hover:bg-popover/60 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 leading-tight">Team misalignment</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Sales promises X, Operations delivers Y</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-popover/40 border border-gray-800/50 rounded-xl p-6 hover:bg-popover/60 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 leading-tight">Data blindness</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Critical metrics buried in 5 different tools</p>
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[calc(50%-12px)] lg:w-[300px] group bg-popover/40 border border-gray-800/50 rounded-xl p-6 hover:bg-popover/60 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <X className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2 leading-tight">Scale paralysis</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Every new hire adds complexity instead of capacity</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="transition-all duration-300 hover:bg-popover/30 rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">$47,000</div>
              <p className="text-muted-foreground text-sm font-bold group-hover:text-purple-300 transition-colors duration-300">Lost annually per employee due to<br />tool switching and inefficiency</p>
            </div>
            <div className="transition-all duration-300 hover:bg-popover/30 rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">2.5 hours</div>
              <p className="text-muted-foreground text-sm font-bold group-hover:text-purple-300 transition-colors duration-300">Wasted daily searching for info<br />across disconnected systems</p>
            </div>
            <div className="transition-all duration-300 hover:bg-popover/30 rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 hover:scale-105 group">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">73%</div>
              <p className="text-muted-foreground text-sm font-bold group-hover:text-purple-300 transition-colors duration-300">Of growing companies hit scaling<br />roadblocks due to complexity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-900/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              One Platform. Total Control.{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Exponential Growth.
              </span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-popover/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 hover:bg-popover/50 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <BarChart3 className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Single Dashboard</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">All your business data unified in one intelligent workspace</p>
              </div>
            </div>
            
            <div className="group bg-popover/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 hover:bg-popover/50 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Target className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Clear Priorities</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Know exactly what matters most at every single moment</p>
              </div>
            </div>
            
            <div className="group bg-popover/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 hover:bg-popover/50 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Rocket className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Fast Execution</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Move from strategic decisions to results three times faster</p>
              </div>
            </div>
            
            <div className="group bg-popover/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 hover:bg-popover/50 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                  <Brain className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="font-bold mb-3 text-white text-lg">Team Knowledge</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Never lose institutional knowledge when team members leave</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Deep Dive */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-24">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl lg:text-4xl font-bold text-white">
                Strategic Command Center
              </h3>
              <p className="text-base text-gray-300 leading-relaxed">
                Get a real-time overview of your entire business in one beautiful dashboard. 
                No more hunting through spreadsheets or jumping between apps to understand what's happening.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Live KPI tracking across all departments</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Automated reporting and alerts</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Predictive analytics and forecasting</span>
                </li>
              </ul>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Explore Command Center
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <img 
                src={devices3d} 
                alt="Zentrix OS Dashboard on Multiple Devices" 
                className="w-full h-auto scale-[1.3]"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-gray-700/50 order-2 lg:order-1">
              <div className="bg-popover rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                    JD
                  </div>
                  <div>
                    <div className="font-semibold text-white">John Doe</div>
                    <div className="text-xs text-muted-foreground">CEO</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-card rounded p-3">
                    <div className="text-sm text-gray-300 mb-1">Action Item #1</div>
                    <div className="text-xs text-muted-foreground">Review Q4 marketing budget</div>
                  </div>
                  <div className="bg-card rounded p-3">
                    <div className="text-sm text-gray-300 mb-1">Decision Made</div>
                    <div className="text-xs text-muted-foreground">Increase social media spend by 20%</div>
                  </div>
                  <div className="bg-purple-500/20 rounded p-3 border border-purple-500/50">
                    <div className="text-sm text-purple-300 mb-1">Next Steps</div>
                    <div className="text-xs text-purple-400">Sarah to create implementation plan by Friday</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 order-1 lg:order-2">
              <h3 className="text-3xl lg:text-4xl font-bold text-white">
                Meeting Intelligence System
              </h3>
              <p className="text-base text-gray-300 leading-relaxed">
                Transform your meetings from time-wasters into results-generators. 
                Every discussion becomes documented decisions and trackable action items.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">AI-powered meeting summaries</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Automatic action item assignment</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Decision tracking and follow-up</span>
                </li>
              </ul>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  See Meeting Intelligence
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl lg:text-4xl font-bold text-white">
                Accountability Engine
              </h3>
              <p className="text-base text-gray-300 leading-relaxed">
                Lock in focus and discipline across your organization. With systematic goal-setting and team metrics, every commitment turns into measurable progress.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Quarterly milestone tracking with Goals</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Team accountability metrics</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Systematic issue identification and solving</span>
                </li>
              </ul>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Explore Accountability Engine
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-gray-700/50 backdrop-blur-sm">
                <div className="bg-popover rounded-lg p-6 shadow-2xl">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-300">Q4 Goals Progress</span>
                      <span className="text-purple-400 text-sm">85% Complete</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 flex-1">Launch new product line</span>
                        <span className="text-green-400 text-xs">Done</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 flex-1">Hire 3 senior developers</span>
                        <span className="text-green-400 text-xs">Done</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-300 flex-1">Achieve $2M ARR milestone</span>
                        <span className="text-yellow-400 text-xs">92%</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="mb-3">
                      <span className="text-sm font-semibold text-gray-300">Team Scorecard</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-card/50 rounded p-3 text-center">
                        <div className="text-green-400 font-bold text-lg">94%</div>
                        <div className="text-xs text-muted-foreground">Sales Goals</div>
                      </div>
                      <div className="bg-card/50 rounded p-3 text-center">
                        <div className="text-purple-400 font-bold text-lg">89%</div>
                        <div className="text-xs text-muted-foreground">Delivery</div>
                      </div>
                      <div className="bg-card/50 rounded p-3 text-center">
                        <div className="text-blue-400 font-bold text-lg">96%</div>
                        <div className="text-xs text-muted-foreground">Quality</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-3xl blur-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
              Real Results, Real Growth
            </h2>
            <p className="text-xl text-gray-300">See how companies like yours transformed their operations</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-8">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">67%</div>
                <div className="text-sm text-muted-foreground font-medium">Team Efficiency Increase</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-8 text-base italic min-h-[120px] flex items-center">
                "We went from chaos to clarity in 30 days. Our team efficiency increased 67% and we hit our annual goal in 8 months."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                  MG
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Marcio Gonçalves</div>
                  <div className="text-sm text-muted-foreground">Founder & CEO at WiseVAs</div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-8">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">$3,200</div>
                <div className="text-sm text-muted-foreground font-medium">Monthly Savings</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-8 text-base italic min-h-[120px] flex items-center">
                "Zentrix replaced 8 different tools and saved us $3,200/month. More importantly, we finally have complete visibility into our business."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                  AC
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Amanda Colaco</div>
                  <div className="text-sm text-muted-foreground">General Manager at Wisenetix</div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/40 border border-gray-700/50 rounded-2xl p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 backdrop-blur-sm text-center">
              <div className="mb-8">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">24/7</div>
                <div className="text-sm text-muted-foreground font-medium">AI Strategic Insights</div>
              </div>
              <blockquote className="text-gray-300 leading-relaxed mb-8 text-base italic min-h-[120px] flex items-center">
                "The AI insights are incredible. It's like having a strategic consultant available 24/7 who knows every detail of our business."
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                  IF
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-base">Iana Ferreira</div>
                  <div className="text-sm text-muted-foreground">Head of Marketing at Wise Scale</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pt-20 pb-8 px-4 sm:px-6 lg:px-8" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-300 mb-8">Choose the plan that fits your growth stage</p>
            
            {/* Pricing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-lg font-medium transition-colors ${!isAnnual ? 'text-white' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
                  isAnnual ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                    isAnnual ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-lg font-medium transition-colors ${isAnnual ? 'text-white' : 'text-muted-foreground'}`}>
                Annual
              </span>
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                isAnnual 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-gray-600 text-muted-foreground'
              }`}>
                Save 17%
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Standard Plan - Most Popular */}
            <div className="bg-white/10 border-2 border-purple-500/30 rounded-xl p-6 text-center bg-gradient-to-b from-purple-900/10 to-blue-900/10 shadow-lg transform scale-105 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3 text-white">Standard</h3>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">${calculateStandardPrice()}</div>
                <div className="text-gray-300 text-sm mb-1">per user per month</div>
                <div className="text-muted-foreground text-xs">Billed {isAnnual ? 'annually' : 'monthly'} • Prorated daily</div>
              </div>
               <ul className="space-y-2 mb-6 text-left text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Up to 100 team members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Full dashboard & reporting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Team task management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Meeting tracking & insights</span>
                </li>
              </ul>
              <Link to="/signup" className="w-full">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3 text-white">Enterprise</h3>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Custom</div>
                <div className="text-gray-300 text-sm mb-1">Contact us for pricing</div>
                <div className="text-muted-foreground text-xs">100+ users minimum</div>
              </div>
              <ul className="space-y-2 mb-6 text-left text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Unlimited team members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Advanced reporting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="text-gray-300">Dedicated account manager</span>
                </li>
              </ul>
              <Button className="w-full bg-white/10 border border-white/20 text-gray-300 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white transition-all duration-300">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="pt-3 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 mb-12 max-w-4xl mx-auto">
            <div className="backdrop-blur-sm bg-transparent border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">Results in 30 days or money back</h3>
              <p className="text-muted-foreground text-xs">We guarantee immediate results.</p>
            </div>
            <div className="backdrop-blur-sm bg-transparent border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">Free tool migration</h3>
              <p className="text-muted-foreground text-xs">We handle all data migration.</p>
            </div>
            <div className="backdrop-blur-sm bg-transparent border-transparent rounded-lg p-4 text-center w-64 hover:bg-white/5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium mb-1 text-white text-sm">No lock-in contracts</h3>
              <p className="text-muted-foreground text-xs">Cancel anytime with full data export.</p>
            </div>
          </div>
          <div className="text-center space-y-6">
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
      <section className="py-12 px-4 sm:px-6 lg:px-8">
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
                question: "What integrations do you support?",
                answer: "We integrate with 200+ popular business tools including Slack, HubSpot, QuickBooks, Google Workspace, and more. Custom integrations are available for Enterprise plans."
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
                    <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
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
              <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Zentrix OS
              </div>
              <p className="text-muted-foreground text-sm max-w-md mb-4">
                The business operating system that replaces 12+ disconnected tools 
                and transforms chaos into predictable growth.
              </p>
              <div className="flex items-center space-x-4">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-white cursor-pointer transition-colors" />
                <Github className="h-5 w-5 text-muted-foreground hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-3 text-white text-sm">Legal</h4>
              <div className="flex flex-col items-start space-y-2">
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Privacy Policy</a>
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Terms of Service</a>
                <a href="#" className="text-muted-foreground hover:text-white transition-colors text-sm">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
              <div className="text-muted-foreground">
                © 2024 Zentrix OS. All rights reserved.
              </div>
              <div className="text-muted-foreground">
                Made with ❤️ for growth-obsessed leaders
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home6;