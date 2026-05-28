import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCelebration } from '@/hooks/useCelebration';
import { logger } from '@/utils/logger';
import { 
  Users, 
  Target, 
  BarChart3, 
  UserPlus, 
  Video, 
  GitBranch, 
  Lightbulb,
  CheckCircle2,
  Circle,
  Play,
  ChevronRight
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  inProgress: boolean;
}

export const AnimatedOnboardingCard: React.FC = () => {
  const { triggerCelebration } = useCelebration();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'create-team',
      title: 'Create a Team',
      description: 'Go to People > Team',
      icon: Users,
      completed: false,
      inProgress: false
    },
    {
      id: 'create-goal',
      title: 'Create a Goal',
      description: 'Set your first objective',
      icon: Target,
      completed: false,
      inProgress: false
    },
    {
      id: 'create-metric',
      title: 'Create a Metric',
      description: 'Define measurable KPIs',
      icon: BarChart3,
      completed: false,
      inProgress: false
    },
    {
      id: 'invite-team',
      title: 'Invite your Team',
      description: 'Add team members',
      icon: UserPlus,
      completed: false,
      inProgress: false
    },
    {
      id: 'run-meeting',
      title: 'Run a Meeting',
      description: 'Conduct team meetings',
      icon: Video,
      completed: false,
      inProgress: false
    },
    {
      id: 'org-chart',
      title: 'Complete the Org Chart',
      description: 'Structure your organization',
      icon: GitBranch,
      completed: false,
      inProgress: false
    },
    {
      id: 'strategy',
      title: 'Design your Strategy and Execution',
      description: 'Plan your roadmap',
      icon: Lightbulb,
      completed: false,
      inProgress: false
    }
  ]);

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleStepAction = async (stepIndex: number) => {
    if (steps[stepIndex].completed || steps[stepIndex].inProgress) return;

    // Start loading state
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, inProgress: true } : step
    ));

    // Simulate realistic loading time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Complete the step
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed: true, inProgress: false } : step
    ));

    // Move to next step or trigger celebration using functional state to avoid stale closure
    setSteps(currentSteps => {
      if (stepIndex < currentSteps.length - 1) {
        setCurrentStep(stepIndex + 1);
      } else if (stepIndex === currentSteps.length - 1) {
        setTimeout(() => {
          logger.log('🎉 CONFETTI TRIGGER: AnimatedOnboardingCard demo completion');
          triggerCelebration();
        }, 500);
      }
      return currentSteps;
    });
  };

  const resetProgress = () => {
    setSteps(prev => prev.map(step => ({ 
      ...step, 
      completed: false, 
      inProgress: false 
    })));
    setCurrentStep(0);
  };

  const StepIcon: React.FC<{ step: OnboardingStep; index: number }> = ({ step, index }) => {
    const IconComponent = step.icon;
    
    if (step.completed) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
        >
          <CheckCircle2 className="w-6 h-6 text-white" />
        </motion.div>
      );
    }
    
    if (step.inProgress) {
      return (
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      );
    }
    
    if (index === currentStep) {
      return (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center"
        >
          <IconComponent className="w-5 h-5 text-primary" />
        </motion.div>
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <IconComponent className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            Get Started with Your Workspace
          </CardTitle>
          {completedSteps === steps.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-success dark:text-green-400"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-semibold">Complete!</span>
            </motion.div>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{completedSteps} of {steps.length} completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.1
              }}
              className={`
                group relative p-4 rounded-lg border transition-all duration-300
                ${step.completed 
                  ? 'bg-success/5 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                  : step.inProgress
                    ? 'bg-primary/5 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    : index === currentStep
                      ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                      : 'bg-muted/30 border-muted'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <StepIcon step={step} index={index} />
                
                <div className="flex-1">
                  <h3 className={`
                    font-semibold transition-colors
                    ${step.completed 
                      ? 'text-success dark:text-green-300'
                      : step.inProgress
                        ? 'text-primary dark:text-blue-300'
                        : index === currentStep
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }
                  `}>
                    {step.title}
                  </h3>
                  <p className={`
                    text-sm transition-colors
                    ${step.completed 
                      ? 'text-success dark:text-green-400'
                      : step.inProgress
                        ? 'text-primary dark:text-blue-400'
                        : index === currentStep
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/70'
                    }
                  `}>
                    {step.description}
                  </p>
                </div>

                {index === currentStep && !step.completed && !step.inProgress && (
                  <Button
                    size="sm"
                    onClick={() => handleStepAction(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                )}

                {step.inProgress && (
                  <div className="text-sm text-primary dark:text-blue-400 font-medium">
                    In Progress...
                  </div>
                )}

                {step.completed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-success dark:text-green-400"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </motion.div>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-9 top-16 w-0.5 h-6 bg-muted-foreground/20" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {completedSteps === steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-success/5 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-center"
          >
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              🎉 Congratulations! You're all set up!
            </h3>
            <p className="text-success dark:text-green-300 text-sm mb-4">
              You've completed all onboarding steps. Your workspace is ready for action!
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetProgress}
              className="border-green-300 dark:border-green-700 text-success dark:text-green-300 hover:bg-success/10 dark:hover:bg-green-900/30"
            >
              Reset Demo
            </Button>
          </motion.div>
        )}

        {completedSteps > 0 && completedSteps < steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-primary/5 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg"
          >
            <div className="flex items-center gap-2 text-primary dark:text-blue-300 text-sm">
              <ChevronRight className="w-4 h-4" />
              <span>Great progress! Continue with the next step.</span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};