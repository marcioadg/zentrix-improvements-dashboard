import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface Step {
  title: string;
  content: string;
}

interface StepGuideProps {
  steps: Step[];
}

export const StepGuide: React.FC<StepGuideProps> = ({ steps }) => {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <Card key={index} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">{index + 1}</span>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-h5 font-semibold mb-2 flex items-center gap-2">
                  {step.title}
                </h3>
                <p className="text-body text-foreground leading-relaxed">
                  {step.content}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-2 p-4 bg-success/5 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg mt-6">
        <CheckCircle className="h-5 w-5 text-success dark:text-green-400 flex-shrink-0" />
        <p className="text-body-sm text-green-900 dark:text-green-100">
          Follow these steps in order for the best results.
        </p>
      </div>
    </div>
  );
};