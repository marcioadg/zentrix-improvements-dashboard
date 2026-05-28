import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxListSelectorProps {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  values: string[];
  onChange: (values: string[]) => void;
}

export const CheckboxListSelector = ({ options, values, onChange }: CheckboxListSelectorProps) => {
  const toggle = (val: string) => {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val]
    );
  };

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left text-base font-medium transition-all duration-200 ${
              selected
                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                : 'border-border bg-background text-foreground hover:border-primary/40'
            }`}
          >
            {/* Checkbox square */}
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
              }`}
            >
              {selected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
