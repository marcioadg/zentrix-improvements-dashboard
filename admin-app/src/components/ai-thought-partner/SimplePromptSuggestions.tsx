
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Lightbulb, FileText, Code, TrendingUp, AlertTriangle, Target, Users } from 'lucide-react';

interface SimplePromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
  hasBusinessData?: boolean;
}

const businessPromptSuggestions = [
  {
    icon: TrendingUp,
    title: "Performance Analysis",
    prompt: "What are my biggest performance issues right now? What should I focus on first?"
  },
  {
    icon: AlertTriangle,
    title: "Critical Issues",
    prompt: "Show me all my red metrics and overdue tasks. What's the root cause analysis?"
  },
  {
    icon: Target,
    title: "Goal Guidance",
    prompt: "Which of my goals are at risk and what actions should I take to get back on track?"
  },
  {
    icon: Users,
    title: "Team Insights",
    prompt: "How is my team performing? Who might need support and what are the bottlenecks?"
  }
];

const generalPromptSuggestions = [
  {
    icon: MessageSquare,
    title: "General Help",
    prompt: "Can you help me brainstorm ideas for improving my productivity?"
  },
  {
    icon: Lightbulb,
    title: "Creative Ideas",
    prompt: "I need creative solutions for a problem I'm facing. Can you help?"
  },
  {
    icon: FileText,
    title: "Writing Assistant",
    prompt: "Help me write a professional email or document."
  },
  {
    icon: Code,
    title: "Technical Help",
    prompt: "I need help understanding a technical concept or solving a problem."
  }
];

export const SimplePromptSuggestions: React.FC<SimplePromptSuggestionsProps> = ({ 
  onPromptSelect, 
  hasBusinessData = false 
}) => {
  const suggestions = hasBusinessData ? businessPromptSuggestions : generalPromptSuggestions;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto px-4">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          className="h-auto p-4 text-left hover:bg-muted border-border rounded-[6px] flex-col items-start justify-start"
          onClick={() => onPromptSelect(suggestion.prompt)}
        >
          <div className="flex items-start gap-3 w-full">
            <suggestion.icon className={`w-5 h-5 mt-1 flex-shrink-0 ${
              hasBusinessData ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-sm mb-2 leading-tight">
                {suggestion.title}
              </div>
              <div className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                {suggestion.prompt}
              </div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
};
