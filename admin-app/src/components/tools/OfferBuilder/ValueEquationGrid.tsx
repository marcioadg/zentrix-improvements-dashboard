import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Clock, Zap } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface ValueEquationGridProps {
  sectionData: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
}

export default function ValueEquationGrid({ sectionData, onSave }: ValueEquationGridProps) {
  const [localData, setLocalData] = useState(sectionData);

  useEffect(() => {
    setLocalData(sectionData);
  }, [sectionData]);

  // Debounced save function
  const [debouncedSave] = useDebouncedCallback(async (data: Record<string, any>) => {
    onSave(data);
  }, 1000);

  const updateField = (section: string, field: string, value: string) => {
    const newData = {
      ...localData,
      [section]: {
        ...localData[section],
        [field]: value
      }
    };
    setLocalData(newData);
    debouncedSave(newData);
  };

  const blockDefinitions = [
    {
      id: 'dream-outcome',
      title: 'Dream Outcome',
      icon: <Target className="h-5 w-5" />,
      prompt: 'What does your avatar *really* want?',
      color: 'bg-primary/5 border-blue-200',
      fields: [
        { name: 'tangible_result', label: 'Tangible Result', placeholder: '$10K extra revenue per month' },
        { name: 'emotional_win', label: 'Emotional Win', placeholder: 'Feel confident and in control' },
        { name: 'value_amount', label: '$ Value or Time Saved', placeholder: '$50,000 or 20 hours/week' },
        { name: 'timeframe', label: 'Target Timeframe', placeholder: 'Within 90 days' }
      ]
    },
    {
      id: 'likelihood',
      title: 'Perceived Likelihood of Success',
      icon: <TrendingUp className="h-5 w-5" />,
      prompt: 'Why should they believe it\'ll work?',
      color: 'bg-success/5 border-green-200',
      fields: [
        { name: 'proof', label: 'Proof (Case Studies, Testimonials)', placeholder: '127 clients achieved X result...' },
        { name: 'guarantee', label: 'Guarantee Details', placeholder: '100% money-back if no results in 30 days' },
        { name: 'framework', label: 'Unique Framework/Process', placeholder: 'The SCALE Method™' },
        { name: 'reputation', label: 'Reputation Indicators', placeholder: 'Featured in Forbes, 50K followers...' }
      ]
    },
    {
      id: 'time-delay',
      title: 'Time Delay',
      icon: <Clock className="h-5 w-5" />,
      prompt: 'When does value show up?',
      color: 'bg-orange-50 border-orange-200',
      fields: [
        { name: 'first_win', label: 'First Win (within 48 hours)', placeholder: 'Setup complete, first lead generated' },
        { name: 'midpoint', label: 'Midpoint Milestone (week 2-3)', placeholder: 'First $1K generated' },
        { name: 'final_result', label: 'Final Result (week 8-12)', placeholder: 'Full $10K/month achieved' }
      ]
    },
    {
      id: 'effort-sacrifice',
      title: 'Effort & Sacrifice',
      icon: <Zap className="h-5 w-5" />,
      prompt: 'How easy can you make this feel?',
      color: 'bg-destructive/5 border-red-200',
      fields: [
        { name: 'time_required', label: 'Time Required', placeholder: 'Just 2 hours per week' },
        { name: 'done_for_you', label: 'What\'s Done-For-You', placeholder: 'We build the funnels, write the copy...' },
        { name: 'eliminated', label: 'What\'s Eliminated', placeholder: 'No cold calling, no tech headaches...' }
      ]
    }
  ];

  const calculateValueScore = () => {
    const dreamScore = Object.keys(localData['dream-outcome'] || {}).length * 5;
    const likelihoodScore = Object.keys(localData['likelihood'] || {}).length * 5;
    const timeScore = Object.keys(localData['time-delay'] || {}).length * 5;
    const effortScore = Object.keys(localData['effort-sacrifice'] || {}).length * 5;
    
    return Math.min(dreamScore + likelihoodScore + (20 - timeScore) + (20 - effortScore), 100);
  };

  const valueScore = calculateValueScore();

  return (
    <div className="space-y-6">
      {/* Value Score Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Value Score</h4>
          <span className="text-lg font-bold">{valueScore}/100</span>
        </div>
        <div className="w-full bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-full h-4 relative">
          <div 
            className="h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${valueScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Low Value</span>
          <span>High Value</span>
        </div>
      </Card>

      {/* Value Equation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blockDefinitions.map((block, index) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${block.color}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {block.icon}
                  {block.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {block.prompt}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {block.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`${block.id}-${field.name}`} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {field.name === 'proof' || field.name === 'framework' || field.name === 'done_for_you' || field.name === 'eliminated' ? (
                      <Textarea
                        id={`${block.id}-${field.name}`}
                        placeholder={field.placeholder}
                        value={localData[block.id]?.[field.name] || ''}
                        onChange={(e) => updateField(block.id, field.name, e.target.value)}
                        className="text-sm min-h-[60px] bg-white"
                      />
                    ) : (
                      <Input
                        id={`${block.id}-${field.name}`}
                        placeholder={field.placeholder}
                        value={localData[block.id]?.[field.name] || ''}
                        onChange={(e) => updateField(block.id, field.name, e.target.value)}
                        className="text-sm bg-white"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}