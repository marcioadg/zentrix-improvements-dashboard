import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, TestTube, Users, CreditCard } from 'lucide-react';

interface TestStep {
  id: string;
  title: string;
  description: string;
  category: 'setup' | 'flow' | 'verification';
  priority: 'critical' | 'important' | 'optional';
  completed?: boolean;
  instructions: string[];
  expectedResult: string;
}

const TEST_STEPS: TestStep[] = [
  {
    id: 'stripe-price-verification',
    title: 'Verify Stripe Price IDs',
    description: 'Ensure configured price IDs exist in your Stripe account',
    category: 'setup',
    priority: 'critical',
    instructions: [
      'Check the Stripe Configuration Verification card above',
      'Both test and live price IDs should show as "VALID"',
      'If invalid, check your Stripe dashboard for correct price IDs'
    ],
    expectedResult: 'Both price IDs show green checkmarks and VALID status'
  },
  {
    id: 'webhook-secret-setup',
    title: 'Add Stripe Webhook Secret',
    description: 'Configure webhook secret for Stripe event processing',
    category: 'setup',
    priority: 'critical',
    instructions: [
      'Go to Stripe Dashboard → Webhooks',
      'Find your webhook endpoint',
      'Copy the webhook signing secret (starts with whsec_)',
      'Add it to Supabase Secrets as STRIPE_WEBHOOK_SECRET_TEST'
    ],
    expectedResult: 'Webhook secret configured in Supabase'
  },
  {
    id: 'trial-display-test',
    title: 'Test Trial Period Display',
    description: 'Verify trial information shows correctly',
    category: 'verification',
    priority: 'important',
    instructions: [
      'Check if Usage Summary shows "🎉 Free Trial Period"',
      'Verify trial end date is displayed',
      'Confirm cost shows $0.00 with "Free during trial" message',
      'Check "After trial" amount shows correct projected cost'
    ],
    expectedResult: 'Trial status clearly displayed with correct dates and costs'
  },
  {
    id: 'checkout-flow-test',
    title: 'Test Complete Checkout Flow',
    description: 'Walk through the entire payment setup process',
    category: 'flow',
    priority: 'critical',
    instructions: [
      'Click "Subscribe" button on subscription card',
      'Enter test card: 4242 4242 4242 4242, any future date, any CVC',
      'Complete checkout process',
      'Verify redirect back to billing page with success message',
      'Check subscription status updates correctly'
    ],
    expectedResult: 'Successful checkout with subscription status updated'
  },
  {
    id: 'user-addition-test',
    title: 'Test User Addition During Trial',
    description: 'Verify usage tracking when users join/leave',
    category: 'flow',
    priority: 'important',
    instructions: [
      'Add a new user to your company during trial',
      'Refresh usage in the Usage Summary',
      'Check that user count increases',
      'Verify "After trial" cost updates accordingly'
    ],
    expectedResult: 'User count and projected costs update correctly'
  },
  {
    id: 'period-navigation-test',
    title: 'Test Billing Period Navigation',
    description: 'Verify historical and projected period viewing',
    category: 'verification',
    priority: 'optional',
    instructions: [
      'Use the chevron buttons to navigate between periods',
      'Check trial period shows correctly',
      'Verify future periods show projections',
      'Test "Back to Current" button works'
    ],
    expectedResult: 'Period navigation works smoothly with correct data'
  },
  {
    id: 'trial-end-simulation',
    title: 'Simulate Trial End (Advanced)',
    description: 'Test what happens when trial expires',
    category: 'flow',
    priority: 'important',
    instructions: [
      'CAUTION: This affects your actual trial',
      'Manually update trial_end date in database to yesterday',
      'Refresh subscription status',
      'Check billing status changes from trial to active billing',
      'Verify usage calculations switch to actual charges'
    ],
    expectedResult: 'System correctly transitions from trial to paid billing'
  }
];

export const BillingFlowTestGuide = () => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['setup']);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleStepCompletion = (stepId: string) => {
    setCompletedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const getStepsByCategory = (category: string) => 
    TEST_STEPS.filter(step => step.category === category);

  const getPriorityColor = (priority: TestStep['priority']) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'important': return 'default';
      case 'optional': return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'setup': return <TestTube className="h-4 w-4" />;
      case 'flow': return <CreditCard className="h-4 w-4" />;
      case 'verification': return <Users className="h-4 w-4" />;
    }
  };

  const categories = [
    { id: 'setup', title: 'Initial Setup', description: 'Essential configuration steps' },
    { id: 'flow', title: 'Payment Flow', description: 'End-to-end billing process testing' },
    { id: 'verification', title: 'Data Verification', description: 'Confirm accurate data display' }
  ];

  const completionStats = {
    total: TEST_STEPS.length,
    completed: completedSteps.length,
    critical: TEST_STEPS.filter(s => s.priority === 'critical' && completedSteps.includes(s.id)).length,
    criticalTotal: TEST_STEPS.filter(s => s.priority === 'critical').length
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Billing System Testing Guide
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {completionStats.completed}/{completionStats.total} Complete
            </Badge>
            <Badge variant={completionStats.critical === completionStats.criticalTotal ? "default" : "destructive"} className="text-xs">
              {completionStats.critical}/{completionStats.criticalTotal} Critical
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This guide helps you systematically test and verify your metered billing implementation. 
            Complete critical steps first to ensure basic functionality.
          </AlertDescription>
        </Alert>

        {categories.map(category => {
          const steps = getStepsByCategory(category.id);
          const isExpanded = expandedSections.includes(category.id);
          const completedInCategory = steps.filter(step => completedSteps.includes(step.id)).length;

          return (
            <div key={category.id} className="border rounded-lg">
              <Collapsible 
                open={isExpanded} 
                onOpenChange={() => toggleSection(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(category.id)}
                      <div>
                        <h3 className="font-medium">{category.title}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {completedInCategory}/{steps.length}
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {steps.map(step => {
                      const isCompleted = completedSteps.includes(step.id);
                      
                      return (
                        <div key={step.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStepCompletion(step.id)}
                                className="p-1 h-auto"
                              >
                                <CheckCircle className={`h-4 w-4 ${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <div className="flex-1">
                                <h4 className="font-medium">{step.title}</h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </div>
                            </div>
                            <Badge variant={getPriorityColor(step.priority)} className="text-xs">
                              {step.priority}
                            </Badge>
                          </div>

                          <div className="ml-7 space-y-3">
                            <div>
                              <div className="text-sm font-medium mb-2">Instructions:</div>
                              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                {step.instructions.map((instruction, index) => (
                                  <li key={index}>{instruction}</li>
                                ))}
                              </ol>
                            </div>

                            <div>
                              <div className="text-sm font-medium mb-1">Expected Result:</div>
                              <p className="text-sm text-success dark:text-green-300 bg-success/5 dark:bg-green-900/20 p-2 rounded">
                                {step.expectedResult}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="font-medium">Testing Progress:</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Overall:</span> {completionStats.completed}/{completionStats.total} steps completed
              </div>
              <div>
                <span className="font-medium">Critical:</span> {completionStats.critical}/{completionStats.criticalTotal} critical steps completed
              </div>
            </div>
            <div className="pt-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${(completionStats.completed / completionStats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};