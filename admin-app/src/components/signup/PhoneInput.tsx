import React from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('phone-input-wrapper', className)}>
      <PhoneInputWithCountry
        international
        defaultCountry="US"
        value={value}
        onChange={(val) => onChange(val || '')}
        disabled={disabled}
        className="phone-input-modern"
      />
    </div>
  );
};
