import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';

interface PersonalityColorSelectorProps {
  selectedColor: 'red' | 'yellow' | 'green' | 'blue' | null | undefined;
  onColorChange: (color: 'red' | 'yellow' | 'green' | 'blue') => void;
  disabled?: boolean;
}

export const PersonalityColorSelector: React.FC<PersonalityColorSelectorProps> = ({
  selectedColor,
  onColorChange,
  disabled = false
}) => {
  const { settings } = useSettings();
  const safeColor = selectedColor || 'green';

  return (
    <Select
      value={safeColor}
      onValueChange={(value) => onColorChange(value as 'red' | 'yellow' | 'green' | 'blue')}
      disabled={disabled}
    >
      <SelectTrigger className="w-32 h-7 text-xs">
        <SelectValue placeholder="Color" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="green">
          {settings?.invert_org_chart_colors ? 'Green (Steady)' : 'Green (Detail-oriented)'}
        </SelectItem>
        <SelectItem value="yellow">Yellow (Social)</SelectItem>
        <SelectItem value="red">Red (Direct)</SelectItem>
        <SelectItem value="blue">
          {settings?.invert_org_chart_colors ? 'Blue (Detail-oriented)' : 'Blue (Steady)'}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

