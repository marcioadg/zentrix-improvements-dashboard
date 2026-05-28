import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, actualTheme } = useTheme();

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getIcon = () => {
    return actualTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getTooltipText = () => {
    return theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-8 w-8 p-0 rounded-[5px] bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      title={getTooltipText()}
      aria-label={getTooltipText()}
      data-theme-toggle
    >
      {getIcon()}
    </Button>
  );
};