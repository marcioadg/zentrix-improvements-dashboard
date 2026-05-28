import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Users, TrendingUp, Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const Landing2: React.FC = () => {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  const benefits = [
    {
      icon: Zap,
      title: "Ship Fast",
      description: "Launch in days, not months. Built for rapid iteration."
    },
    {
      icon: Users,
      title: "Team Sync",
      description: "Everyone on the same page, all the time."
    },
    {
      icon: TrendingUp,
      title: "Scale Easy",
      description: "Grow from 5 to 500 without breaking a sweat."
    }
  ];

  const metrics = [
    { value: "10K+", label: "Companies" },
    { value: "98%", label: "Satisfaction" },
    { value: "2.5M", label: "Goals Hit" },
    { value: "<2min", label: "Setup Time" }
  ];

  const testimonials = [
    {
      quote: "We went from chaos to clarity in a week. Game changer.",
      author: "Sarah Chen",
      role: "CEO, TechCo"
    },
    {
      quote: "Finally, a tool that doesn't get in the way. Just works.",
      author: "Mike Torres",
      role: "Head of Ops, StartupXYZ"
    },
    {
      quote: "Our productivity doubled. No exaggeration.",
      author: "Lisa Park",
      role: "Founder, GrowthLab"
    }
  ];

  const mockups = [
    "/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png",
    "/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png",
    "/lovable-uploads/1a8bdcf2-1d95-4a87-8596-e81f8c8dc773.png"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Zentrix
          </div>
          <Link to="/signup">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
              Start Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Trusted by 10,000+ fast-moving teams
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
            Run your business
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              at lightspeed
            </span>
          </h1>
          <p className="text-xl text-secondary-foreground mb-10 max-w-2xl mx-auto">
            The operating system for ambitious teams. Set goals, track progress, ship faster.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg px-10 h-14 gap-2 border-0 shadow-lg shadow-purple-500/30">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card • 2-minute setup
          </p>
        </div>
      </section>

      {/* Product Carousel */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent>
              {mockups.map((mockup, index) => (
                <CarouselItem key={index}>
                  <div className="p-2">
                    <img
                      src={mockup}
                      alt={`Product view ${index + 1}`}
                      className="w-full rounded-2xl shadow-2xl border border-border"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-gradient-to-b from-purple-50/50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 mb-6">
                    <Icon className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-secondary-foreground text-lg">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {metric.value}
                </div>
                <div className="text-secondary-foreground">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-purple-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-border">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-6 text-lg font-medium">
                  "{testimonial.quote}"
                </p>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-secondary-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Simple pricing
          </h2>
          <p className="text-xl text-secondary-foreground mb-8">
            Start free. Scale when ready.
          </p>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-10 border-2 border-purple-200">
            <div className="mb-6">
              <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                $29
                <span className="text-2xl text-secondary-foreground font-normal">/user</span>
              </div>
              <div className="text-secondary-foreground">per month</div>
            </div>
            <Link to="/signup">
              <Button size="lg" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-14 text-lg border-0">
                Start 14-Day Trial
              </Button>
            </Link>
            <p className="text-sm text-secondary-foreground mt-4">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to move fast?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join 10,000+ teams shipping faster with Zentrix.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white hover:bg-muted/50 text-secondary-foreground text-lg px-10 h-14 gap-2 shadow-xl">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Zentrix. All rights reserved.</div>
          <div className="flex gap-8">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing2;
