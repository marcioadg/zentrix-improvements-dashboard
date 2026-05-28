import { useState } from 'react';
import { LayoutGrid, Building2, Users, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

const apps = [
  {
    name: 'Zentrix OS',
    description: 'Operations',
    href: 'https://zentrixos.com/dashboard',
    icon: Building2,
    matches: ['zentrixos.com'],
  },
  {
    name: 'Zentrix CRM',
    description: 'Relationships',
    href: 'https://zentrixcrm.ai/tasks',
    icon: Users,
    matches: ['zentrixcrm.ai'],
  },
  {
    name: 'Zentrix Insights',
    description: 'Culture',
    href: 'https://zentrixinsights.com/dashboard',
    icon: Brain,
    matches: ['zentrixinsights.com'],
  },
];

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const currentHost = window.location.hostname;

  const handleAppSwitch = async (e: React.MouseEvent<HTMLAnchorElement>, href: string, isActive: boolean) => {
    if (isActive) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && session?.refresh_token) {
        
      // Pass current company name to target app for cross-schema matching
      const companyName = encodeURIComponent(localStorage.getItem('zentrix_active_company_name') || '');
      const url = `${href}/#access_token=${session.access_token}&refresh_token=${session.refresh_token}&token_type=bearer&type=signin&company_name=${companyName}`;
        window.location.href = url;
      } else {
        window.location.href = href;
      }
    } catch {
      window.location.href = href;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-[4px] transition-colors duration-150",
            "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            open && "bg-sidebar-accent text-sidebar-foreground"
          )}
          aria-label="Switch app"
        >
          <LayoutGrid className="h-4 w-4 stroke-[1.5]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[240px] p-2"
      >
        <div className="px-1 pb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">
          Zentrix Products
        </div>
        <div className="grid grid-cols-1 gap-0.5">
          {apps.map((app) => {
            const isActive = app.matches.some(m => currentHost.includes(m));
            return (
              <a
                key={app.name}
                href={app.href}
                
                
                onClick={(e) => handleAppSwitch(e, app.href, isActive)}
                className={cn(
                  "flex items-center gap-3 rounded-[4px] px-2 py-2.5 transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  isActive
                    ? "bg-state-active text-foreground pointer-events-none"
                    : "text-foreground hover:bg-state-hover"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] border",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-foreground"
                  )}
                >
                  <app.icon className="h-4 w-4 stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight">{app.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">{app.description}</div>
                </div>
              </a>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
