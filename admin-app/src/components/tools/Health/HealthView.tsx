import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Download, Calendar, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface HealthMetric {
  id: string;
  name: string;
  value: string;
  lastChecked: Date | null;
  inRange: boolean;
  tooltip: string;
  category: 'cardiovascular' | 'metabolic' | 'hormonal' | 'body-composition' | 'lifestyle';
}

const healthMetrics: HealthMetric[] = [
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    value: '120/80',
    lastChecked: new Date('2024-01-15'),
    inRange: true,
    tooltip: 'Prevent silent cardiovascular damage and fatigue.',
    category: 'cardiovascular'
  },
  {
    id: 'resting-heart-rate',
    name: 'Resting Heart Rate',
    value: '65 bpm',
    lastChecked: new Date('2024-01-20'),
    inRange: true,
    tooltip: 'Lower RHR = better fitness and recovery.',
    category: 'cardiovascular'
  },
  {
    id: 'hrv',
    name: 'HRV',
    value: '45 ms',
    lastChecked: new Date('2024-01-22'),
    inRange: true,
    tooltip: 'Higher HRV = better stress resilience and adaptability.',
    category: 'cardiovascular'
  },
  {
    id: 'fasting-glucose',
    name: 'Fasting Blood Glucose',
    value: '85 mg/dL',
    lastChecked: new Date('2024-01-10'),
    inRange: true,
    tooltip: 'Keep energy stable and avoid insulin resistance.',
    category: 'metabolic'
  },
  {
    id: 'hemoglobin-a1c',
    name: 'Hemoglobin A1C',
    value: '5.2%',
    lastChecked: new Date('2024-01-05'),
    inRange: true,
    tooltip: '90-day view of blood sugar control.',
    category: 'metabolic'
  },
  {
    id: 'testosterone',
    name: 'Testosterone (Total + Free)',
    value: '650 ng/dL',
    lastChecked: null,
    inRange: false,
    tooltip: 'Key for energy, drive, mood, and body composition.',
    category: 'hormonal'
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol',
    value: 'LDL: 110, HDL: 55',
    lastChecked: new Date('2024-01-08'),
    inRange: true,
    tooltip: 'Watch LDL, HDL, Triglycerides to manage heart health.',
    category: 'cardiovascular'
  },
  {
    id: 'body-fat',
    name: 'Body Fat %',
    value: '12%',
    lastChecked: new Date('2024-01-18'),
    inRange: true,
    tooltip: 'More meaningful than weight. Affects hormones and inflammation.',
    category: 'body-composition'
  },
  {
    id: 'weight',
    name: 'Weight',
    value: '180 lbs',
    lastChecked: new Date('2024-01-23'),
    inRange: true,
    tooltip: 'Track trends, not just the number. Combine with BF%.',
    category: 'body-composition'
  },
  {
    id: 'sleep-quality',
    name: 'Sleep Quality',
    value: '8.2/10',
    lastChecked: new Date('2024-01-23'),
    inRange: true,
    tooltip: 'Poor sleep = poor thinking, mood, and metabolism.',
    category: 'lifestyle'
  },
  {
    id: 'daily-steps',
    name: 'Steps (Daily Avg)',
    value: '9,500',
    lastChecked: new Date('2024-01-23'),
    inRange: true,
    tooltip: 'Movement baseline. Aim for 8K+ daily.',
    category: 'lifestyle'
  },
  {
    id: 'stress-level',
    name: 'Stress Level',
    value: '3/10',
    lastChecked: new Date('2024-01-22'),
    inRange: true,
    tooltip: 'Helps spot burnout risk. Track over time.',
    category: 'lifestyle'
  },
  {
    id: 'supplements',
    name: 'Supplements / Meds Taken',
    value: 'Vitamin D, Omega-3',
    lastChecked: new Date('2024-01-23'),
    inRange: true,
    tooltip: 'Maintain consistency and avoid overlap.',
    category: 'lifestyle'
  }
];

const HealthView = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>(healthMetrics);

  const updateMetricStatus = (id: string, inRange: boolean) => {
    setMetrics(prev => prev.map(metric => 
      metric.id === id ? { ...metric, inRange } : metric
    ));
  };

  const updateMetricDate = (id: string) => {
    setMetrics(prev => prev.map(metric => 
      metric.id === id ? { ...metric, lastChecked: new Date() } : metric
    ));
  };

  const metricsInRange = metrics.filter(m => m.inRange).length;
  const totalMetrics = metrics.length;
  const progressPercentage = (metricsInRange / totalMetrics) * 100;

  const metricsUpdatedThisMonth = metrics.filter(m => {
    if (!m.lastChecked) return false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return m.lastChecked >= monthStart;
  }).length;

  const exportHealthSnapshot = () => {
    // For now, we'll just show an alert. In a real implementation,
    // this would generate and download a PDF
    alert('Health snapshot export would be implemented here');
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">Health</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Track your key health metrics to maintain energy, focus, and long-term performance.
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Health Overview</span>
            <Button onClick={exportHealthSnapshot} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Health Snapshot
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Metrics in Range</span>
              <span>{metricsInRange} of {totalMetrics}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <div className="text-sm text-muted-foreground">
            {metricsUpdatedThisMonth} metrics updated this month
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <TooltipProvider>
          {metrics.map((metric) => (
            <Card key={metric.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {metric.name}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{metric.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <Badge 
                    variant={metric.inRange ? "default" : "destructive"}
                    className="cursor-pointer"
                    onClick={() => updateMetricStatus(metric.id, !metric.inRange)}
                  >
                    {metric.inRange ? (
                      <><Check className="h-3 w-3 mr-1" /> In Range</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Needs Attention</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">{metric.value}</div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Last checked: {metric.lastChecked 
                          ? format(metric.lastChecked, 'MMM d, yyyy')
                          : 'Never'
                        }
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => updateMetricDate(metric.id)}
                      className="h-auto p-1 text-xs"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default HealthView;