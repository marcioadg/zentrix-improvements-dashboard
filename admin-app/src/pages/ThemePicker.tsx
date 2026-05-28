import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  THEME_COLORS,
  THEME_GRADIENTS,
  applyThemeColor,
  getSavedTheme,
  saveThemeColor,
} from '@/lib/themeColors';
import type { ThemeColor } from '@/lib/themeColors';
import { useSettings } from '@/contexts/SettingsContext';

const ThemePicker = () => {
  const { updateThemeColor } = useSettings();
  const [selected, setSelected] = useState<ThemeColor>(
    () => THEME_COLORS.find((c) => c.name === getSavedTheme()) || THEME_COLORS[0]
  );

  useEffect(() => {
    applyThemeColor(selected.name);
  }, [selected]);

  // Re-apply on theme (light/dark) toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyThemeColor(selected.name);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [selected]);

  const handleSelect = (color: ThemeColor) => {
    setSelected(color);
  };

  const handleApply = () => {
    saveThemeColor(selected.name, async (color) => {
      await updateThemeColor(color);
    });
    toast.success('Theme saved');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[22px] font-semibold tracking-tight">Theme</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choose your primary color
          </p>
        </div>

        {/* Color Swatches Grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {THEME_COLORS.map((color) => {
            const isActive = selected.name === color.name;
            const isDark = document.documentElement.classList.contains('dark');
            const displayHex = isDark ? color.darkHex : color.hex;
            const gradient = THEME_GRADIENTS[color.name];

            return (
              <button
                key={color.name}
                onClick={() => handleSelect(color)}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-[6px] border p-3 transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                {/* Swatch circle */}
                <div className="relative">
                  <div
                    className="h-10 w-10 rounded-full shadow-sm"
                    style={gradient ? { background: gradient } : { backgroundColor: displayHex }}
                  />
                  {isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {/* Name */}
                <span
                  className={cn(
                    'text-center text-[11px] font-medium leading-tight',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {color.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gradient note */}
        {THEME_GRADIENTS[selected.name] && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Gradient applies to buttons
          </p>
        )}

        {/* Live Preview Section */}
        <div className="mt-10">
          <h2 className="mb-4 text-[13px] font-medium text-muted-foreground">
            Preview
          </h2>
          <div className="space-y-5 rounded-lg border border-border bg-card p-6">
            {/* Buttons row */}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default" size="default">
                Save Changes
              </Button>
              <Button variant="secondary" size="default">
                Cancel
              </Button>
              <Button variant="soft" size="default">
                Soft button
              </Button>
            </div>

            {/* Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="default">{selected.name}</Badge>
              <Badge variant="todo">Active</Badge>
            </div>

            {/* Card with colored left border */}
            <div
              className="rounded-md border border-border bg-background p-4"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: `hsl(${
                  document.documentElement.classList.contains('dark')
                    ? selected.darkHsl
                    : selected.hsl
                })`,
              }}
            >
              <p className="text-[13px] font-medium text-foreground">
                Project update
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                This card uses the selected primary color as its left border
                accent.
              </p>
            </div>

            {/* Tab strip */}
            <div className="flex gap-0 border-b border-border">
              <button className="border-b-2 border-primary px-3 pb-2 text-[13px] font-medium text-foreground">
                Overview
              </button>
              <button className="border-b-2 border-transparent px-3 pb-2 text-[13px] text-muted-foreground hover:text-foreground">
                Activity
              </button>
              <button className="border-b-2 border-transparent px-3 pb-2 text-[13px] text-muted-foreground hover:text-foreground">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Apply button */}
        <div className="mt-8 flex items-center gap-3">
          <Button variant="default" size="lg" onClick={handleApply}>
            Apply to app
          </Button>
          <span className="text-[12px] text-muted-foreground">
            Currently: {selected.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ThemePicker;
