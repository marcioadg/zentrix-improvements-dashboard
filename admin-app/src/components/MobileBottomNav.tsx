import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Target, CheckSquare, MessageCircleQuestion, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileShellSafe } from '@/contexts/MobileShellContext';

interface MobileBottomNavProps {
  centerAction?: React.ReactNode;
}

const MobileBottomNav = ({ centerAction }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pressedHref, setPressedHref] = useState<string | null>(null);
  
  // Safe context access - returns null when outside MobileShellProvider (e.g., on /tasks page)
  const mobileShellContext = useMobileShellSafe();
  // Note: mobileShellContext kept for future use, bottom nav now always visible

  const navItems = [
    { icon: CheckSquare, label: 'Tasks', href: '/m/tasks' },
    { icon: MessageCircleQuestion, label: 'Issues', href: '/m/issues' },
    { icon: Building2, label: 'Team', href: '/m/company' },
    { icon: Target, label: 'Goals', href: '/m/goals' },
    { icon: BarChart3, label: 'Metrics', href: '/m/metrics' }
  ];

  const leftItems = centerAction ? navItems.slice(0, 2) : navItems.slice(0, 2);
  const rightItems = centerAction ? navItems.slice(2) : navItems.slice(2);

  const blurActiveElement = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') active.blur();
  };

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.href;
    const isPressed = pressedHref === item.href;
    const Icon = item.icon;

    return (
      <button
        type="button"
        aria-label={item.label}
        onPointerDown={() => setPressedHref(item.href)}
        onPointerUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPressedHref(null);
          blurActiveElement();
          if (!isActive) navigate(item.href);
        }}
        onPointerCancel={() => setPressedHref(null)}
        onClick={(e) => {
          // Prevent double-fire (pointerup already handled). Keyboard users handled below.
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            blurActiveElement();
            if (!isActive) navigate(item.href);
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center",
          "min-w-[64px] py-2 px-1",
          "transition-all duration-100 ease-out",
          "touch-manipulation select-none",
          "pointer-events-auto",
          "outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-md",
          isPressed && "scale-[0.90]",
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {/* Icon container with glow effect for active state */}
        <div className={cn(
          "w-10 h-7 rounded-full flex items-center justify-center mb-0.5",
          "transition-all duration-200 ease-out",
          isActive && "bg-primary/12",
          isPressed && !isActive && "bg-muted/40"
        )}>
          <Icon
            className={cn(
              "h-5 w-5 transition-all duration-200",
              isActive && "scale-110",
              isPressed && "scale-90"
            )}
            strokeWidth={isActive ? 2.5 : 2}
            style={isActive ? {
              filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))'
            } : undefined}
          />
        </div>

        {/* Label with increased size and weight */}
        <span className={cn(
          "text-xs leading-tight transition-all duration-150",
          isActive ? "font-bold" : "font-medium"
        )}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-[100]",
      "bg-background/95 backdrop-blur-md",
      "pb-[calc(env(safe-area-inset-bottom)+8px)]",
      "block lg:hidden",
      "pointer-events-auto",
      // Prevent iOS address bar resize from affecting position
      "will-change-transform"
    )}>
      {/* Top separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="flex items-center justify-around h-16">
        {leftItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {centerAction && (
          <div className="flex items-center justify-center -mt-6">
            <div className="transform transition-transform duration-100 active:scale-90">
              {centerAction}
            </div>
          </div>
        )}

        {rightItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
