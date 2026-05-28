import React, { useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface MobileSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Premium mobile select with micro-interactions
 * - Press feedback
 * - Focus ring animation
 * - Smooth chevron rotation
 */
export const MobileSelect: React.FC<MobileSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseDown={() => !disabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onTouchStart={() => !disabled && setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        disabled={disabled}
        className={cn(
          "w-full h-11 pl-4 pr-10",
          "bg-background border border-[var(--border)] rounded-[6px]",
          "text-sm font-medium text-foreground",
          "appearance-none cursor-pointer",
          "transition-all duration-100 ease-out",
          "focus:outline-none",
          isFocused && "ring-2 ring-primary/30 border-primary/50",
          isPressed && "scale-[0.99] opacity-90",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {placeholder && !value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Animated chevron */}
      <ChevronDown 
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
          "transition-all duration-200",
          isFocused ? "text-primary rotate-180" : "text-muted-foreground"
        )} 
      />
    </div>
  );
};
