import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Science: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            Zentrix
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-8">
          The Science Behind Zentrix OS
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Goal Setting Theory and the Power of Clarity
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Zentrix OS is built on decades of research in organizational psychology, beginning with Locke and Latham's Goal Setting Theory. Their work demonstrated that specific and challenging goals consistently outperform vague or easy goals. When teams know exactly what they are working toward, performance increases by approximately 25 to 30 percent.
              </p>
              <p>
                Zentrix OS applies this research through a structured goal hierarchy that creates full organizational line of sight. Long term vision informs annual priorities, which break down into quarterly focus areas and weekly commitments. This approach aligns with studies showing that employees are significantly more engaged when they can see how their daily actions connect to larger strategic objectives.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              The Rhythm of Accountability
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Zentrix OS incorporates principles from behavioral science known as implementation intentions, which emphasize defining the when, where, and how of executing a goal. Weekly check ins are intentionally built into the system because research shows they create the optimal frequency for feedback, adjustment, and accountability without becoming burdensome.
              </p>
              <p>
                Studies published by the Harvard Business Review reveal that teams using structured weekly reviews are up to three times more likely to achieve their quarterly targets. Zentrix OS provides a clear meeting rhythm that supports this science, guiding teams through progress evaluation, data review, problem solving, and commitments for the upcoming week.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Data Driven Decision Making and Leading Indicators
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The Zentrix OS scorecard system is grounded in the distinction between leading and lagging indicators. Most organizations track lagging indicators such as revenue or profit, which only reflect what has already happened. High performing organizations emphasize leading indicators, the measurable inputs that create future results.
              </p>
              <p>
                Research from the Balanced Scorecard Institute shows that companies that systematically track leading indicators are roughly 70 percent more likely to execute their strategies successfully. Zentrix OS makes it simple to identify, monitor, and visualize these predictive metrics, turning intuition driven management into evidence based leadership.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Psychological Safety and Structured Issue Resolution
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Zentrix OS integrates findings from Google's Project Aristotle, which identified psychological safety as the strongest predictor of high performing teams. The platform provides a structured environment where challenges can be raised without blame, allowing organizations to surface and address obstacles early.
              </p>
              <p>
                The issue resolution process is designed to reduce cognitive load by breaking problem solving into clear steps: identify the root of the problem, discuss it openly, and resolve it with a concrete action. This systematic approach ensures that issues are not ignored or repeatedly revisited but are handled efficiently and transparently.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Built for Alignment, Predictability, and Strategic Execution
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Zentrix OS combines organizational science, behavioral psychology, and systems engineering to create a unified operating architecture built for growth. By grounding daily operations in proven research, the system allows companies to align teams, increase execution reliability, improve communication, and scale without losing clarity or cohesion.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Zentrix. All rights reserved.</div>
          <div className="flex gap-8">
            <Link to="/science" className="hover:text-foreground transition-colors">The Science</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:rodrigo@zentrixventures.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Science;
