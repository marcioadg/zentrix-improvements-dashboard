import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Target, TrendingUp, Users, Calendar, BarChart3, Zap, Shield } from 'lucide-react';
import heroDashboard from '@/assets/hero-dashboard.png';
import desktopDashboard from '@/assets/desktop-dashboard.png';
import metricsView from '@/assets/metrics-view.png';
import devices3d from '@/assets/devices-3d.png';
import zentrixLogo from '@/assets/Logo-Zentrix.png';
const Home5 = () => {
  return <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={zentrixLogo} alt="Zentrix OS Logo" className="h-6 w-auto" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-secondary-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-secondary-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-secondary-foreground hover:text-foreground transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-accent hover:bg-accent-hover">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                One Platform.<br />
                Total Visibility.<br />
                <span className="text-accent">Real Results.</span>
              </h1>
              <p className="text-xl text-secondary-foreground mb-8 leading-relaxed">
                Bring your tasks, goals, metrics, and meetings together in one unified platform. 
                Execute with clarity and speed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" className="bg-accent hover:bg-accent-hover h-14 px-8 text-base font-semibold">
                    Start Free Trial
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold">
                  See How It Works
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">No credit card required • 30-day free trial</p>
            </div>
            <div className="relative">
              <img src={heroDashboard} alt="Dashboard preview showing unified business management platform" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-muted/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-secondary-foreground font-medium">Trusted by 1000+ high-performing teams</p>
          <div className="flex justify-center items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(star => <span key={star} className="text-yellow-400 text-xl">★</span>)}
            <span className="ml-2 text-secondary-foreground font-semibold">4.9/5</span>
          </div>
        </div>
      </section>

      {/* Feature Section 1: Dashboard Overview */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                See Your Entire Business at a Glance
              </h2>
              <p className="text-lg text-secondary-foreground mb-8 leading-relaxed">
                Get instant visibility into every aspect of your operations. Our unified dashboard 
                brings together tasks, goals, metrics, and meetings in one beautiful interface.
              </p>
              <ul className="space-y-4">
                {['Track tasks, goals, and metrics in one place', 'Real-time visibility across all teams', 'Never miss a deadline or priority', 'Intuitive interface that everyone loves'].map((benefit, index) => <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-secondary-foreground font-medium">{benefit}</span>
                  </li>)}
              </ul>
            </div>
            <div className="relative">
              <img src={desktopDashboard} alt="Unified dashboard showing tasks, goals, and metrics" className="w-full h-auto" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Visual Metrics */}
      <section className="py-24 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 -mx-6 lg:mx-0">
              <img src={metricsView} alt="Visual scorecards with color-coded performance tracking" className="w-full h-auto scale-110" loading="lazy" decoding="async" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Track What Matters with Visual Scorecards
              </h2>
              <p className="text-lg text-secondary-foreground mb-8 leading-relaxed">
                Monitor your key performance indicators with beautiful, color-coded scorecards. 
                Know instantly what's on track and what needs attention.
              </p>
              <ul className="space-y-4">
                {['Color-coded performance tracking', 'Weekly scorecard reviews', 'Mobile access anywhere, anytime', 'Automatic alerts and notifications'].map((benefit, index) => <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-secondary-foreground font-medium">{benefit}</span>
                  </li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Multi-Device */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Work Seamlessly Across All Your Devices
              </h2>
              <p className="text-lg text-secondary-foreground mb-8 leading-relaxed">Desktop, tablet, or mobile - your work stays perfectly synced. Beautiful and functional on every screen size.</p>
              <ul className="space-y-4">
                {['Desktop, tablet, and mobile optimized', 'Sync in real-time across devices', 'Beautiful interface on every screen', 'Native app performance'].map((benefit, index) => <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-secondary-foreground font-medium">{benefit}</span>
                  </li>)}
              </ul>
            </div>
            <div className="relative">
              <img src={devices3d} alt="Platform displayed on desktop, tablet, and mobile devices" className="w-full h-auto" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-24 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need to Execute Better
            </h2>
            <p className="text-xl text-secondary-foreground max-w-2xl mx-auto">
              All the tools your team needs to stay aligned, focused, and productive.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[{
            icon: Target,
            title: 'Goals & Objectives',
            description: 'Set and track quarterly goals and annual objectives with crystal clarity'
          }, {
            icon: TrendingUp,
            title: 'Task Management',
            description: 'Organize and prioritize work with powerful task tracking'
          }, {
            icon: Shield,
            title: 'Issues Tracking',
            description: 'Identify, discuss, and solve problems systematically'
          }, {
            icon: Calendar,
            title: 'Meeting Management',
            description: 'Run productive meetings with built-in agendas and notes'
          }, {
            icon: Users,
            title: 'Team Collaboration',
            description: 'Keep everyone aligned with real-time updates and comments'
          }, {
            icon: BarChart3,
            title: 'Real-time Metrics',
            description: 'Monitor KPIs and scorecards with instant visibility'
          }].map((feature, index) => <div key={index} className="bg-white p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-secondary-foreground">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Get Started in Three Simple Steps
            </h2>
            <p className="text-xl text-secondary-foreground max-w-2xl mx-auto">
              From setup to execution in minutes, not weeks.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[{
            step: '01',
            title: 'Set Up in Minutes',
            description: 'Quick onboarding gets your team up and running fast. Import existing data or start fresh.'
          }, {
            step: '02',
            title: 'Align Your Team',
            description: 'Invite team members, set goals, and establish your workflow in one collaborative workspace.'
          }, {
            step: '03',
            title: 'Track and Achieve',
            description: 'Monitor progress in real-time, adjust as needed, and celebrate wins together.'
          }].map((item, index) => <div key={index} className="text-center">
                <div className="text-5xl font-bold text-accent/20 mb-4">{item.step}</div>
                <h3 className="text-2xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-secondary-foreground leading-relaxed">{item.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-24 px-6 bg-accent text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Real Results for Real Businesses
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              See how teams are transforming their execution with our platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[{
            number: '3x',
            label: 'Faster Goal Achievement'
          }, {
            number: '85%',
            label: 'Reduction in Missed Deadlines'
          }, {
            number: '4.5hrs',
            label: 'Saved Per Week Per Team Member'
          }].map((stat, index) => <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center border border-white/20">
                <div className="text-5xl font-bold mb-2">{stat.number}</div>
                <div className="text-lg text-blue-100">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-secondary-foreground mb-12">
            Start with a 30-day free trial. No credit card required.
          </p>
          
          <div className="bg-white rounded-lg shadow-xl p-12 border border-border">
            <div className="mb-8">
              <div className="text-5xl font-bold text-foreground mb-2">
                $5<span className="text-2xl text-muted-foreground">/user/month</span>
              </div>
              <p className="text-secondary-foreground">Simple per-user pricing, billed monthly</p>
            </div>
            
            <ul className="space-y-4 mb-8 text-left max-w-md mx-auto">
              {['Unlimited goals and tasks', 'All features included', 'Priority support', 'Advanced security', 'Custom integrations', 'Dedicated success manager'].map((feature, index) => <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-secondary-foreground">{feature}</span>
                </li>)}
            </ul>
            
            <Link to="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent-hover h-14 px-12 text-base font-semibold">
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Zap className="w-16 h-16 text-accent mx-auto mb-6" />
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Business Execution?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Join thousands of teams who have already made the switch. Start your free trial today.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-accent hover:bg-accent-hover h-16 px-12 text-lg font-semibold">
              Start Free Trial
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">No credit card required • Cancel anytime • 30-day guarantee</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-popover text-muted-foreground border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center">
            <p>&copy; 2025 Your Company. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Home5;