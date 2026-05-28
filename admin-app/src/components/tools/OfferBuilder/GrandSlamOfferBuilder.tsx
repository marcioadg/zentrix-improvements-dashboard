import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, User, Target } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface GrandSlamOfferBuilderProps {
  sectionData: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
}

export default function GrandSlamOfferBuilder({ sectionData, onSave }: GrandSlamOfferBuilderProps) {
  const [localData, setLocalData] = useState(sectionData);

  useEffect(() => {
    setLocalData(sectionData);
  }, [sectionData]);

  // Debounced save function
  const [debouncedSave] = useDebouncedCallback(async (data: Record<string, any>) => {
    onSave(data);
  }, 1000);

  const updateField = (field: string, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    debouncedSave(newData);
  };

  const generateOfferNames = () => {
    const powerVerb = localData.power_verb || 'Transform';
    const result = localData.result || 'Your Business';
    const mechanism = localData.mechanism || 'System';
    const timeframe = localData.timeframe || '90 Days';

    return [
      `${powerVerb} ${result} ${mechanism}`,
      `The ${timeframe} ${result} ${mechanism}`,
      `${mechanism} to ${powerVerb} ${result} in ${timeframe}`
    ];
  };

  const suggestedNames = generateOfferNames();

  return (
    <div className="space-y-6">
      {/* Avatar Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Avatar Definition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role-industry">Role / Industry / Size</Label>
              <Input
                id="role-industry"
                placeholder="SaaS CEOs with 10-50 employees"
                value={localData.role_industry || ''}
                onChange={(e) => updateField('role_industry', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency of Pain (1-10)</Label>
              <Input
                id="urgency"
                type="number"
                min="1"
                max="10"
                placeholder="8"
                value={localData.urgency || ''}
                onChange={(e) => updateField('urgency', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Outcome */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Offer Outcome
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="offer-outcome">Go from [current state] to [desired state] in [timeframe]</Label>
            <Textarea
              id="offer-outcome"
              placeholder="Go from struggling to get leads to generating 50 qualified prospects per month in 90 days"
              value={localData.offer_outcome || ''}
              onChange={(e) => updateField('offer_outcome', e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Offer Name Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Offer Name Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="power-verb">Power Verb</Label>
              <Input
                id="power-verb"
                placeholder="Transform, Build, Scale, Master"
                value={localData.power_verb || ''}
                onChange={(e) => updateField('power_verb', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="result">Result</Label>
              <Input
                id="result"
                placeholder="Lead Generation, Revenue, Team"
                value={localData.result || ''}
                onChange={(e) => updateField('result', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mechanism">Mechanism</Label>
              <Input
                id="mechanism"
                placeholder="Blueprint, System, Method, Framework"
                value={localData.mechanism || ''}
                onChange={(e) => updateField('mechanism', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Input
                id="timeframe"
                placeholder="90-Day, 30-Day, 12-Week"
                value={localData.timeframe || ''}
                onChange={(e) => updateField('timeframe', e.target.value)}
              />
            </div>
          </div>

          {/* Generated Names */}
          <div className="space-y-2">
            <Label>Suggested Offer Names</Label>
            <div className="space-y-2">
              {suggestedNames.map((name, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateField('selected_offer_name', name)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {localData.selected_offer_name && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <Label className="text-sm font-medium">Selected Offer Name:</Label>
              <p className="text-lg font-bold text-primary">{localData.selected_offer_name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Offer Items */}
      <Card>
        <CardHeader>
          <CardTitle>Main Offer Items</CardTitle>
          <p className="text-sm text-muted-foreground">
            What exactly do they get? (Keep it simple - 3-5 main components)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="offer-items">Core Offer Components</Label>
            <Textarea
              id="offer-items"
              placeholder="1. Complete lead generation system setup&#10;2. 90 days of campaign management&#10;3. Weekly strategy calls&#10;4. Custom landing pages and funnels&#10;5. Performance tracking dashboard"
              value={localData.offer_items || ''}
              onChange={(e) => updateField('offer_items', e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}