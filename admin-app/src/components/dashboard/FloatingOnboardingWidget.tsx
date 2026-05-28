import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  Rocket,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useCelebration } from '@/hooks/useCelebration';
import { useOnboarding } from '@/contexts/OnboardingContext';

export const FloatingOnboardingWidget: React.FC = () => {
  // Removed excessive logging
  
  const { triggerCelebration } = useCelebration();
  const navigate = useNavigate();
  
  // Always call hooks unconditionally
  const onboardingData = useOnboarding();
  // Removed useOnboarding logging
  
  const { 
    steps, 
    isVisible, 
    completedCount, 
    totalSteps, 
    progressPercentage, 
    allCompleted,
    isInitiallyCompleted,
    celebrationShown,
    hideWidget, 
    resetProgress 
  } = onboardingData;
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('onboarding-widget-expanded');
    return saved !== null ? saved === 'true' : true;
  });

  // Navigation mapping for each step
  const stepNavigation: Record<string, string> = {
    'create-team': '/people?tab=team',
    'create-goal': '/goals',
    'create-metric': '/metrics', 
    'invite-team': '/people',
    'run-meeting': '/meetings',
    'org-chart': '/org-chart',
    'strategy': '/strategy'
  };

  const handleStepClick = (stepId: string) => {
    const navigationPath = stepNavigation[stepId];
    if (navigationPath) {
      navigate(navigationPath);
    }
  };

  // Trigger celebration when all steps complete (only for new completions)
  React.useEffect(() => {
    if (allCompleted && completedCount > 0 && !isInitiallyCompleted && !celebrationShown) {
      setTimeout(() => {
        triggerCelebration();
      }, 500);
    }
  }, [allCompleted, completedCount, isInitiallyCompleted, celebrationShown, triggerCelebration]);

  // Hide when a variant onboarding (B/C) is active — they have their own experience
  const hasVariantOnboarding = (() => {
    try { return !!sessionStorage.getItem('onboarding_variant'); } catch { return false; }
  })();

  if (!isVisible || hasVariantOnboarding) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 z-50 w-80"
      style={{ right: '7rem' }} // Position further left from FAB
      data-onboarding-widget
    >
      <Card className="shadow-lg border border-border/50 backdrop-blur-sm bg-background/95">
        {/* Collapsed Header */}
        <div className={`transition-all duration-200 ${isExpanded ? 'p-4' : 'p-3'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${isExpanded ? 'w-8 h-8' : 'w-6 h-6'} rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200`}>
                <Rocket className={`${isExpanded ? 'w-4 h-4' : 'w-3 h-3'} text-primary`} />
              </div>
              <div>
                <h3 className={`font-semibold ${isExpanded ? 'text-sm' : 'text-xs'}`}>Get Started</h3>
                {isExpanded && (
                  <p className="text-xs text-muted-foreground">
                    {completedCount} of {totalSteps} completed
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {allCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-success"
                >
                  <CheckCircle2 className={`${isExpanded ? 'w-5 h-5' : 'w-4 h-4'}`} />
                </motion.div>
              )}
              {!isExpanded && !allCompleted && (
                <span className="text-xs font-medium text-muted-foreground">
                  {completedCount}/{totalSteps}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newState = !isExpanded;
                  setIsExpanded(newState);
                  localStorage.setItem('onboarding-widget-expanded', String(newState));
                }}
                className={`${isExpanded ? 'h-8 w-8' : 'h-6 w-6'} p-0`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={hideWidget}
                className={`${isExpanded ? 'h-8 w-8' : 'h-6 w-6'} p-0 text-muted-foreground hover:text-foreground`}
              >
                <X className={`${isExpanded ? 'w-4 h-4' : 'w-3 h-3'}`} />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar - always show but smaller when collapsed */}
          <div className={`${isExpanded ? 'mt-3' : 'mt-2'}`}>
            <Progress value={progressPercentage} className={`${isExpanded ? 'h-2' : 'h-1'}`} />
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-2 max-h-80 overflow-y-auto">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        group p-3 rounded-[6px] border transition-colors duration-150 cursor-pointer hover:border-primary/30
                        ${step.completed 
                          ? 'bg-success/10 border-success/20 hover:bg-success/15'
                          : step.inProgress
                            ? 'bg-primary/10 border-primary/20'
                            : 'bg-muted/30 border-muted hover:bg-muted/50'
                        }
                      `}
                      onClick={() => handleStepClick(step.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center transition-colors
                          ${step.completed
                            ? 'bg-success'
                            : step.inProgress
                              ? 'bg-primary'
                              : 'bg-muted-foreground/20'
                          }
                        `}>
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <IconComponent className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`
                            text-sm font-medium truncate
                            ${step.completed ? 'text-success' : 'text-foreground'}
                          `}>
                            {step.title}
                          </h4>
                          <p className={`
                            text-xs truncate
                            ${step.completed ? 'text-success/80' : 'text-muted-foreground'}
                          `}>
                            {step.description}
                          </p>
                        </div>

                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  );
                })}

                {allCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-success/10 border border-success/20 rounded-[6px] text-center"
                  >
                    <h4 className="font-semibold text-success text-[13px] mb-1">
                      🎉 All set up!
                    </h4>
                    <p className="text-success/80 text-[11px] mb-3">
                      Your workspace is ready for action!
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetProgress}
                      className="border-success/30 text-success hover:bg-success/10 text-xs h-7"
                    >
                      Reset Demo
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};