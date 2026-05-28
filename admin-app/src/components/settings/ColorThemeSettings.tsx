import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  THEME_COLORS,
  THEME_GRADIENTS,
  THEME_STORAGE_KEY,
  applyThemeColor,
  getSavedTheme,
  saveThemeColor,
} from '@/lib/themeColors';
import { useSettings } from '@/contexts/SettingsContext';

const COLORED_SIDEBAR_KEY = 'zentrix-colored-sidebar';

function getColoredSidebar(): boolean {
  try {
    const val = localStorage.getItem(COLORED_SIDEBAR_KEY);
    return val !== 'false'; // default ON — only off if explicitly set to 'false'
  } catch { return true; }
}

function applyColoredSidebar(enabled: boolean) {
  if (enabled) {
    document.documentElement.setAttribute('data-sidebar', 'colored');
  } else {
    document.documentElement.removeAttribute('data-sidebar');
  }
}

export const ColorThemeSettings: React.FC = () => {
  const { settings, updateThemeColor } = useSettings();
  const [selected, setSelected] = useState(getSavedTheme);
  const [coloredSidebar, setColoredSidebar] = useState(getColoredSidebar);

  // On mount: DB value overrides localStorage
  useEffect(() => {
    if (settings?.theme_color) {
      const dbColor = settings.theme_color;
      if (THEME_COLORS.some((c) => c.name === dbColor)) {
        setSelected(dbColor);
        localStorage.setItem(THEME_STORAGE_KEY, dbColor);
        applyThemeColor(dbColor);
      }
    }
  }, [settings?.theme_color]);

  useEffect(() => {
    applyThemeColor(selected);
  }, [selected]);

  // Re-apply on light/dark toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyThemeColor(selected);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [selected]);

  // Apply colored sidebar on mount
  useEffect(() => {
    applyColoredSidebar(coloredSidebar);
  }, [coloredSidebar]);

  const handleColoredSidebarToggle = (enabled: boolean) => {
    setColoredSidebar(enabled);
    localStorage.setItem(COLORED_SIDEBAR_KEY, String(enabled));
    applyColoredSidebar(enabled);
  };

  const handleSelect = (colorName: string) => {
    setSelected(colorName);
    applyThemeColor(colorName);
    saveThemeColor(colorName, async (color) => {
      await updateThemeColor(color);
    });
    toast.success('Theme saved');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your color theme
        </p>
      </div>

      {/* Colored Sidebar Toggle */}
      <div className="flex items-center justify-between rounded-[6px] border border-border bg-card px-4 py-3">
        <div>
          <Label className="text-[13px] font-medium">Colored sidebar</Label>
          <p className="text-[12px] text-muted-foreground mt-0.5">Apply your theme color to the sidebar background</p>
        </div>
        <Switch
          checked={coloredSidebar}
          onCheckedChange={handleColoredSidebarToggle}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {THEME_COLORS.map((color) => {
          const isActive = selected === color.name;
          const isDark = document.documentElement.classList.contains('dark');
          const displayHex = isDark ? color.darkHex : color.hex;
          const gradient = THEME_GRADIENTS[color.name];

          return (
            <button
              key={color.name}
              onClick={() => handleSelect(color.name)}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-[6px] border p-3 transition-colors',
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
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
    </div>
  );
};
