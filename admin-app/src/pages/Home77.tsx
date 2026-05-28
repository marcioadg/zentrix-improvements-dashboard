import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, TrendingUp, Users, Clock } from 'lucide-react';

const Home77: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-lg font-semibold text-foreground">Zentrix</div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-secondary-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup">
              <Button size="sm" className="[background:var(--btn-bg,hsl(var(--primary)))] text-primary-foreground hover:opacity-90">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 tracking-tight leading-tight">
          The operating system<br />for modern teams
        </h1>
        <p className="text-xl text-secondary-foreground mb-8 max-w-2xl mx-auto">
          Align goals, track progress, and execute faster. Everything your team needs in one simple platform.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link to="/signup">
            <Button size="lg" className="[background:var(--btn-bg,hsl(var(--primary)))] text-primary-foreground hover:opacity-90 px-8 h-12 text-base font-medium">
              Start free trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">No credit card required · 14-day free trial</p>
        </div>

        {/* Product Mockup */}
        <div className="mt-16 relative">
          <div className="rounded-2xl border border-border shadow-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 p-8">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Q4 Revenue Goal</div>
                  <div className="text-sm text-muted-foreground">On track · 87% complete</div>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-[87%]"></div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">$2.1M</div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">$2.4M</div>
                  <div className="text-xs text-muted-foreground">Target</div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-success">+23%</div>
                  <div className="text-xs text-muted-foreground">Growth</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Align your team</h3>
            <p className="text-sm text-secondary-foreground">Set clear objectives and keep everyone moving in the same direction.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Track progress</h3>
            <p className="text-sm text-secondary-foreground">Real-time dashboards show exactly where your team stands on every goal.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Move faster</h3>
            <p className="text-sm text-secondary-foreground">Eliminate meetings and sync chaos with built-in workflows.</p>
          </div>
        </div>
      </section>

      {/* Traction Metrics */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-foreground mb-1">10,000+</div>
              <div className="text-sm text-secondary-foreground">Active companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-1">$500M+</div>
              <div className="text-sm text-secondary-foreground">Revenue tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-1">2.5M+</div>
              <div className="text-sm text-secondary-foreground">Goals achieved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground mb-1">40%</div>
              <div className="text-sm text-secondary-foreground">Time saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Logos */}
      <section className="py-12 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by leading companies</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40">
            {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((name, i) => (
              <div key={i} className="text-xl font-bold text-foreground">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Walkthrough */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">How it works</h2>
          <p className="text-secondary-foreground">Simple, powerful, and built for speed</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-border p-6 bg-white shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-4"></div>
            <h3 className="font-semibold text-foreground mb-2">Set your goals</h3>
            <p className="text-sm text-secondary-foreground">Define objectives and key results in minutes</p>
          </div>
          <div className="rounded-xl border border-border p-6 bg-white shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4"></div>
            <h3 className="font-semibold text-foreground mb-2">Track in real-time</h3>
            <p className="text-sm text-secondary-foreground">See progress update automatically as work happens</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Loved by teams everywhere</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "Zentrix helped us scale from 10 to 100 people without losing alignment.", author: "Sarah Chen", role: "CEO, TechCorp" },
              { quote: "We cut our weekly meetings in half and shipped 2x faster.", author: "James Rodriguez", role: "VP Product, StartupXYZ" },
              { quote: "Finally, a tool that actually makes sense for how we work.", author: "Emily Watson", role: "Head of Ops, GrowthCo" }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-border">
                <p className="text-secondary-foreground mb-4 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Simple, transparent pricing</h2>
          <p className="text-secondary-foreground">Start free, scale as you grow</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border-2 border-purple-200 bg-white p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
              RECOMMENDED
            </div>
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-foreground mb-2">
                $29
                <span className="text-xl text-muted-foreground font-normal">/user/mo</span>
              </div>
              <div className="text-sm text-muted-foreground">Billed annually</div>
            </div>
            <Link to="/signup" className="block mb-6">
              <Button className="w-full [background:var(--btn-bg,hsl(var(--primary)))] text-primary-foreground hover:opacity-90 h-12">
                Start free trial
              </Button>
            </Link>
            <div className="space-y-3">
              {['Unlimited goals & metrics', 'Advanced analytics', 'Priority support', 'Custom integrations', '99.9% uptime SLA'].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-secondary-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-purple-600 to-pink-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to transform your team?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of companies running better with Zentrix
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-primary hover:bg-muted/50 px-10 h-14 text-lg font-semibold">
              Get started for free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2024 Zentrix. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home77;
