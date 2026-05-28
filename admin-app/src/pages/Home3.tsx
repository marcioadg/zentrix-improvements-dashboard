import { Button } from "@/components/ui/button";
import { RetroGrid } from "@/components/ui/retro-grid";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Users, TrendingUp, Timer, Zap } from "lucide-react";

const Home3 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-sm"></div>
              </div>
              <span className="text-xl font-medium text-white">Zentrix OS</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#product" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Product</a>
              <a href="#resources" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Resources</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Pricing</a>
              <a href="#customers" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Customers</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Contact</a>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted text-sm">
                Log in
              </Button>
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 text-sm px-4 py-2">
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-black flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,120,120,0.1),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] animate-pulse"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
              Zentrix OS is a purpose-built tool for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                scaling businesses
              </span>
            </h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Meet the system that turns Alex Hormozi's $100M frameworks into your competitive advantage.
              <br />
              Replace 12+ tools with one AI-powered business OS.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-base px-6 py-3 font-medium">
                Start building
              </Button>
              <Button variant="ghost" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-muted text-base px-6 py-3">
                New: $100M Frameworks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Product Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
            className="relative perspective-1000"
          >
            <div className="relative mx-auto max-w-5xl transform rotate-x-6 hover:rotate-x-2 transition-transform duration-500">
              <div className="rounded-xl border border-white/20 bg-gradient-to-b from-gray-900 to-black shadow-2xl overflow-hidden">
                <div className="bg-popover border-b border-white/10 px-4 py-3 flex items-center space-x-2">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-destructive"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground">Zentrix OS Dashboard</div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-12 gap-4 mb-6">
                    <div className="col-span-3 space-y-2">
                      <div className="h-8 bg-primary/20 rounded border border-blue-500/30"></div>
                      <div className="h-6 bg-gray-700/50 rounded"></div>
                      <div className="h-6 bg-gray-700/50 rounded"></div>
                      <div className="h-6 bg-gray-700/50 rounded"></div>
                    </div>
                    <div className="col-span-9 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-32 bg-white/90 rounded"></div>
                        <div className="h-8 w-24 bg-primary rounded"></div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="h-20 bg-purple-500/20 rounded border border-purple-500/30 p-3">
                          <div className="h-3 w-3 bg-purple-400 rounded mb-2"></div>
                          <div className="h-2 bg-purple-300/50 rounded"></div>
                        </div>
                        <div className="h-20 bg-green-500/20 rounded border border-green-500/30 p-3">
                          <div className="h-3 w-3 bg-green-400 rounded mb-2"></div>
                          <div className="h-2 bg-green-300/50 rounded"></div>
                        </div>
                        <div className="h-20 bg-yellow-500/20 rounded border border-yellow-500/30 p-3">
                          <div className="h-3 w-3 bg-yellow-400 rounded mb-2"></div>
                          <div className="h-2 bg-yellow-300/50 rounded"></div>
                        </div>
                        <div className="h-20 bg-destructive/20 rounded border border-red-500/30 p-3">
                          <div className="h-3 w-3 bg-red-400 rounded mb-2"></div>
                          <div className="h-2 bg-red-300/50 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded border border-gray-700/50">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <div className="h-3 flex-1 bg-gray-600/50 rounded"></div>
                          <div className="h-3 w-16 bg-blue-400/50 rounded"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded border border-gray-700/50">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="h-3 flex-1 bg-gray-600/50 rounded"></div>
                          <div className="h-3 w-20 bg-purple-400/50 rounded"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded border border-gray-700/50">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <div className="h-3 flex-1 bg-gray-600/50 rounded"></div>
                          <div className="h-3 w-12 bg-green-400/50 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Growing businesses waste 2+ hours daily switching between 12+ disconnected tools
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              You're paying $3,000+ monthly for tools that don't talk to each other.
              Your team loses critical insights in the chaos while competitors gain ground.
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <Timer className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">2+ Hours Lost Daily</h3>
                <p className="text-muted-foreground">Context switching between disconnected tools</p>
              </div>
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">$3,000+ Monthly</h3>
                <p className="text-muted-foreground">Wasted on tools that don't integrate</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Team Misalignment</h3>
                <p className="text-muted-foreground">Critical insights lost in the tool chaos</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Replace 12 tools with one AI-powered business OS
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Built-in Alex Hormozi frameworks ($100M Offers + $100M Leads) with real-time dashboards that actually drive decisions.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-6 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Zap className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Strategic Planning</h3>
              <p className="text-muted-foreground">Turn Hormozi's frameworks into your growth engine</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-6 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Team Alignment</h3>
              <p className="text-muted-foreground">Everyone works toward the same goals, automatically</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-6 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <CheckCircle className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Productivity Tools</h3>
              <p className="text-muted-foreground">Delegate & Elevate + Clarity Breaks built-in</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="p-6 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-time Intelligence</h3>
              <p className="text-muted-foreground">Know exactly what's working (and what isn't)</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join 2,500+ businesses already using Zentrix OS
            </h2>
            <p className="text-xl text-muted-foreground">
              Your competitors are already consolidating their tech stack
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-card"
            >
              <p className="text-lg mb-4 italic">
                "Zentrix replaced 8 different tools and saved us $3,200/month. 
                The Alex Hormozi frameworks are game-changing."
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <span className="text-primary font-semibold">AC</span>
                </div>
                <div>
                  <p className="font-semibold">Amanda Colaco</p>
                  <p className="text-muted-foreground">Wisenetix</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 rounded-lg border border-border bg-card"
            >
              <p className="text-lg mb-4 italic">
                "67% efficiency increase. We hit our annual goal in 8 months. 
                It's like having a strategic consultant 24/7."
              </p>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <span className="text-primary font-semibold">MG</span>
                </div>
                <div>
                  <p className="font-semibold">Marcio Goncalves</p>
                  <p className="text-muted-foreground">WiseVAs</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to replace your tool chaos?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the businesses who've already consolidated their tech stack and unlocked 
              Alex Hormozi's proven frameworks for systematic growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="text-lg px-8 py-4">
                Start Your 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Calculate Your Savings
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-8 justify-center text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-primary mr-2" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-primary mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-primary mr-2" />
                Setup in under 30 minutes
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-bold mb-4 md:mb-0">Zentrix OS</div>
            <div className="flex space-x-6 text-muted-foreground">
              <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#support" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home3;