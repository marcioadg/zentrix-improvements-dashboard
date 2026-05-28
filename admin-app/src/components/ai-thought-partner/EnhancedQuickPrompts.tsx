
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, TrendingUp, Building, Lightbulb, CheckSquare, BarChart3, AlertTriangle, Zap, DollarSign } from 'lucide-react';

interface EnhancedQuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

const prompts = [
  {
    category: 'Strategic Clarity',
    icon: Target,
    items: [
      "What's our biggest bottleneck to growth right now?",
      "Are we solving a real problem that people will pay for?",
      "What would have to be true for us to 10x our business?",
      "Where should we focus our limited resources for maximum impact?",
      "What's the biggest constraint in my business today to 10X profits?",
      "What market opportunities are we missing that could 10X revenue?"
    ]
  },
  {
    category: 'Revenue Optimization',
    icon: DollarSign,
    items: [
      "What's preventing us from doubling our profit margins?",
      "Which revenue streams have the highest potential for growth?",
      "How can we increase customer lifetime value by 3x?",
      "What pricing strategy changes could boost profits immediately?",
      "Where are we leaving money on the table?",
      "What would it take to achieve 10X profit growth in 12 months?"
    ]
  },
  {
    category: 'Decision Framework',
    icon: Lightbulb,
    items: [
      "Help me prioritize these 3 strategic options",
      "What assumptions am I making that could be wrong?",
      "How does this decision align with our core values?",
      "What data do I need to make this decision confidently?",
      "What are the potential blind spots in this strategy?",
      "How can I stress-test this business decision?"
    ]
  },
  {
    category: 'Execution Focus',
    icon: CheckSquare,
    items: [
      "Are our weekly actions tied to quarterly priorities?",
      "What should we stop doing to focus on what matters?",
      "How do we measure if we're winning?",
      "Which overdue tasks are actually mission-critical?",
      "What's the 20% of activities driving 80% of results?",
      "How can we accelerate our most important initiatives?"
    ]
  },
  {
    category: 'Team Alignment',
    icon: Users,
    items: [
      "Do we have the right people in the right seats?",
      "Where are communication breakdowns happening?",
      "What's causing friction in our team dynamics?",
      "How can we better distribute workload across the team?",
      "What skills gaps are limiting our growth?",
      "How do we improve team accountability and performance?"
    ]
  },
  {
    category: 'Culture & Systems',
    icon: Building,
    items: [
      "Where are we tolerating mediocrity?",
      "Are our meetings creating traction or just noise?",
      "What cultural changes do we need to scale?",
      "How can we automate or eliminate time-wasting processes?",
      "What systems need to be built for sustainable growth?",
      "How do we maintain quality while scaling rapidly?"
    ]
  },
  {
    category: 'Performance Analysis',
    icon: TrendingUp,
    items: [
      "What metrics actually predict our success?",
      "Where are we measuring activity instead of outcomes?",
      "How do we know if our strategy is working?",
      "Analyze my metrics and suggest ways to turn red into green",
      "What leading indicators should we track for 10X growth?",
      "How can we improve our competitive positioning?"
    ]
  },
  {
    category: 'Issue Resolution',
    icon: AlertTriangle,
    items: [
      "Which issues deserve the most urgent attention?",
      "What patterns do you see in our recurring problems?",
      "How can we prevent these issues from happening again?",
      "What's the root cause analysis for our biggest challenges?",
      "How do we turn operational problems into growth opportunities?",
      "What systematic changes would eliminate 80% of current issues?"
    ]
  },
  {
    category: 'Data-Driven Insights',
    icon: BarChart3,
    items: [
      "What story does my current data tell about our performance?",
      "Where do I see disconnects between goals and actual results?",
      "What leading indicators should we be tracking?",
      "How can we improve our team health score?",
      "What patterns in our data predict future success or failure?",
      "How do our metrics compare to industry benchmarks?"
    ]
  },
  {
    category: 'Growth Acceleration',
    icon: Zap,
    items: [
      "What's the fastest path to doubling our business?",
      "Which growth lever would have the most immediate impact?",
      "How can we systematically remove growth bottlenecks?",
      "What partnerships or alliances could accelerate growth?",
      "How do we scale without breaking what's already working?",
      "What would a 10X growth plan look like for the next 90 days?"
    ]
  }
];

export const EnhancedQuickPrompts: React.FC<EnhancedQuickPromptsProps> = ({ onPromptSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prompts.map((category) => {
        const IconComponent = category.icon;
        return (
          <Card key={category.category} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <IconComponent className="h-4 w-4" />
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {category.items.map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full text-left justify-start h-auto p-2 text-xs whitespace-normal"
                  onClick={() => onPromptSelect(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
