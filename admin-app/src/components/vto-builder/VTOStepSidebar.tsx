import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  shortLabel: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export const VTOStepSidebar: React.FC<Props> = ({ steps, currentStep, onStepClick }) => (
  <nav className="hidden md:flex flex-col w-56 bg-card border-r border-border py-6 px-3 shrink-0">
    {steps.map((step, i) => {
      const isDone = i < currentStep;
      const isCurrent = i === currentStep;
      return (
        <button
          key={step.id}
          onClick={() => onStepClick(i)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            isCurrent
              ? 'bg-primary/10 text-primary font-semibold'
              : isDone
              ? 'text-muted-foreground hover:bg-muted'
              : 'text-muted-foreground/60 hover:bg-muted'
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isCurrent
                ? 'bg-primary text-primary-foreground'
                : isDone
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </span>
          <span className="truncate">{step.label}</span>
        </button>
      );
    })}
  </nav>
);
