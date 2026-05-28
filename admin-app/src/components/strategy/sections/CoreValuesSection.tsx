import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

export const CoreValuesSection: React.FC = () => {
  const {
    data,
    addCoreValue,
    removeCoreValue,
    updateCoreValue
  } = useSimpleStrategy();
  const [newValue, setNewValue] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  const handleAddValue = () => {
    if (newValue.trim() && data.coreValues.length < 7) {
      addCoreValue(newValue.trim(), newExplanation.trim());
      setNewValue('');
      setNewExplanation('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddValue();
    }
  };

  const handleValueChange = (id: string, value: string, currentExplanation: string) => {
    updateCoreValue(id, value, currentExplanation);
  };

  const handleExplanationChange = (id: string, currentValue: string, explanation: string) => {
    updateCoreValue(id, currentValue, explanation);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg font-semibold">
          Core Values
        </Label>
        <p className="text-sm text-muted-foreground mt-1">What guides how we work?</p>
      </div>

      {/* Column Headers */}
      {data.coreValues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pb-2 border-b border-muted">
          <div className="md:col-span-1">
            <Label className="text-sm font-medium text-muted-foreground">
              Value
            </Label>
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-muted-foreground">
              What it means
            </Label>
          </div>
        </div>
      )}

      {/* Existing Core Values */}
      <div className="space-y-3">
        {data.coreValues.map((coreValue) => (
          <Card key={coreValue.id} className="p-4 relative group">
            <button
              onClick={() => removeCoreValue(coreValue.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive"
              aria-label="Delete core value"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
              <div className="md:col-span-1">
                <Textarea
                  value={coreValue.value}
                  onChange={(e) => handleValueChange(coreValue.id, e.target.value, coreValue.explanation || '')}
                  className="border-0 bg-transparent px-0 py-1 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b focus-visible:border-input hover:bg-muted/50 transition-colors resize-none min-h-0"
                  placeholder="Enter core value..."
                  rows={1}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  value={coreValue.explanation || ''}
                  onChange={(e) => handleExplanationChange(coreValue.id, coreValue.value, e.target.value)}
                  className="border-0 bg-transparent px-0 py-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b focus-visible:border-input hover:bg-muted/50 transition-colors resize-none min-h-0 overflow-hidden"
                  placeholder="Explain what this value means..."
                  rows={1}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Core Value */}
      {data.coreValues.length < 7 && (
        <div className="flex items-center gap-2 px-4">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add core value..."
            className="flex-1 border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40"
          />
          <Button
            onClick={handleAddValue}
            size="sm"
            variant="ghost"
            disabled={!newValue.trim()}
            className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {data.coreValues.length >= 7 && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum of 7 core values reached
        </p>
      )}
    </div>
  );
};
