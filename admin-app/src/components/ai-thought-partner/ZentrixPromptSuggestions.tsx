import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Users, AlertTriangle, BarChart3, ListChecks, Activity, ShieldAlert } from 'lucide-react';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';

interface ZentrixPromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
}

export const ZentrixPromptSuggestions: React.FC<ZentrixPromptSuggestionsProps> = ({
  onPromptSelect
}) => {
  const { hasManagerAccess } = useCurrentUserPermissionLevel();

  const managerPrompts = [
    {
      icon: Target,
      prompt: "Where are we off track on our quarterly company goals?",
      color: 'text-primary bg-primary/10 hover:bg-primary/20 border-primary/30'
    },
    {
      icon: TrendingUp,
      prompt: "How are we progressing toward our 3-year picture?",
      color: 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border-[var(--accent)]/30'
    },
    {
      icon: BarChart3,
      prompt: "Which KPIs are most misaligned with our current strategy?",
      color: 'text-[var(--warning)] bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20 border-[var(--warning)]/30'
    },
    {
      icon: ListChecks,
      prompt: "What should be our top three priorities for next quarter?",
      color: 'text-[var(--success)] bg-[var(--success)]/10 hover:bg-[var(--success)]/20 border-[var(--success)]/30'
    },
    {
      icon: Users,
      prompt: "How is my the team performing against its Goals and Metrics?",
      color: 'text-[var(--info)] bg-[var(--info)]/10 hover:bg-[var(--info)]/20 border-[var(--info)]/30'
    },
    {
      icon: AlertTriangle,
      prompt: "What's holding back the Operations team from hitting its goals?",
      color: 'text-[var(--warning)] bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20 border-[var(--warning)]/30'
    },
    {
      icon: Activity,
      prompt: "Which team has the largest performance gap this quarter?",
      color: 'text-destructive bg-destructive/10 hover:bg-destructive/20 border-destructive/30'
    },
    {
      icon: ShieldAlert,
      prompt: "What risks exist in our current org structure?",
      color: 'text-destructive bg-destructive/10 hover:bg-destructive/20 border-destructive/30'
    }
  ];

  const icPrompts = [
    {
      icon: Target,
      prompt: "How am I tracking on my Goals, Metrics and responsibilities?",
      color: 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border-[var(--accent)]/30'
    }
  ];

  const suggestions = hasManagerAccess ? managerPrompts : icPrompts;

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground mb-1">
          {hasManagerAccess ? 'Manager Quick Insights' : 'Personal Quick Insights'}
        </h2>
        <p className="text-xs text-muted-foreground">
          Click any question to get AI-powered insights
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              onClick={() => onPromptSelect(suggestion.prompt)}
              variant="outline"
              className={`h-auto py-3 px-3 flex items-start gap-2 text-left justify-start border ${suggestion.color} transition-all duration-200 hover:shadow-sm`}
            >
              <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-medium leading-relaxed">
                {suggestion.prompt}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
