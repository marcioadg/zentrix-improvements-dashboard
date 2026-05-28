import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { ArrowRight, Check, Play, Star, Users, Zap, Shield, Sparkles, Globe, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Modern geometric background component
const GeometricBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-20 right-20 w-32 h-32 bg-primary/5 rounded-full blur-xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-40 left-10 w-24 h-24 bg-accent/10 rounded-full blur-lg"
        animate={{
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
    </div>
  );
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = React.useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      let startTime: number;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        const current = Math.floor(progress * end);
        setCount(current);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [end, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

// Modern hero section
const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <GeometricBackground />
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">New: AI-Powered Insights</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Build Better
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Organizations
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            The modern platform that helps teams align, execute, and scale with confidence.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button size="lg" className="px-8 py-6 text-lg font-semibold group">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-semibold group">
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60"
          >
            <span className="text-sm">Trusted by 50,000+ teams</span>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
              <span className="ml-2 text-sm">4.9/5 rating</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Bento grid showcase
const BentoGrid = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const features = [
    {
      title: "Task Management",
      description: "Streamline workflows with intelligent automation",
      icon: <Zap className="w-8 h-8 text-primary" />,
      className: "md:col-span-2 md:row-span-2",
      gradient: "from-primary/10 to-primary/5",
    },
    {
      title: "Real-time Analytics",
      description: "Data-driven insights for better decisions",
      icon: <TrendingUp className="w-6 h-6 text-accent-foreground" />,
      className: "md:col-span-1",
      gradient: "from-accent/20 to-accent/10",
    },
    {
      title: "Team Collaboration",
      description: "Connect and align your entire organization",
      icon: <Users className="w-6 h-6 text-secondary-foreground" />,
      className: "md:col-span-1",
      gradient: "from-secondary/20 to-secondary/10",
    },
    {
      title: "Enterprise Security",
      description: "Bank-grade security with compliance built-in",
      icon: <Shield className="w-6 h-6 text-muted-foreground" />,
      className: "md:col-span-1",
      gradient: "from-muted/20 to-muted/10",
    },
    {
      title: "Global Scale",
      description: "Built for teams of all sizes worldwide",
      icon: <Globe className="w-6 h-6 text-primary/80" />,
      className: "md:col-span-1",
      gradient: "from-primary/15 to-primary/5",
    },
  ];

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything you need to
            <br />
            <span className="text-primary">scale your team</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for modern organizations that want to move fast and stay aligned.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={cn(feature.className)}
            >
              <Card className={cn(
                "h-full border-border/50 hover:border-border transition-all duration-300 group cursor-pointer",
                "hover:shadow-lg hover:-translate-y-1"
              )}>
                <CardContent className={cn(
                  "p-8 h-full flex flex-col justify-between",
                  `bg-gradient-to-br ${feature.gradient}`
                )}>
                  <div>
                    <div className="mb-4 p-3 rounded-lg bg-background/50 w-fit">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-6">
                    <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Social proof section
const SocialProof = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { label: "Active Users", value: 50000, suffix: "+" },
    { label: "Tasks Completed", value: 2000000, suffix: "+" },
    { label: "Countries", value: 120, suffix: "+" },
    { label: "Uptime", value: 99.9, suffix: "%" },
  ];

  return (
    <section ref={ref} className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Trusted by teams worldwide
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of organizations already scaling with our platform
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                <AnimatedCounter end={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA section
const CTASection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="p-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to transform
                <br />
                <span className="text-primary">your organization?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start your free trial today. No credit card required, no setup fees.
                Get up and running in under 5 minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button size="lg" className="px-8 py-6 text-lg font-semibold group">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-semibold">
                  Talk to Sales
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Cancel anytime
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

// Main component
const Home2 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Modern Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">
            <span className="text-primary">Org</span>Flow
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <HeroSection />
      <BentoGrid />
      <SocialProof />
      <CTASection />

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="text-muted-foreground">
            © 2024 OrgFlow. Built with precision and care.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home2;