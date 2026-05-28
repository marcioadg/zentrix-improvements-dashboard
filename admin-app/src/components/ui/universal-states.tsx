import React, { useState, useEffect } from 'react';
import { LucideIcon, Target, Calendar, WifiOff, Clock, ShieldOff, FileQuestion, Zap, AlertTriangle, Archive, Sparkles, Wrench, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
interface EducationalEmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  steps?: string[];
  benefits?: string[];
  action?: string;
  onAction?: () => void;
  helpLink?: string;
  tip?: string;
  illustration?: React.ReactNode;
  className?: string;
}
export const EducationalEmptyState: React.FC<EducationalEmptyStateProps> = ({
  icon: Icon,
  title,
  subtitle,
  steps,
  benefits,
  action,
  onAction,
  helpLink,
  tip,
  illustration,
  className
}) => {
  return <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4 animate-fade-in', className)}>
      {illustration ? <div className="mb-6 animate-scale-in">{illustration}</div> : <div className="mb-6 relative">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-primary/10 backdrop-blur-sm rounded-full p-6 ring-1 ring-primary/10 animate-scale-in">
            <Icon className="h-12 w-12 text-primary/60" strokeWidth={2} />
          </div>
        </div>}
      
      <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-base text-muted-foreground max-w-md mx-auto mb-6">
        {subtitle}
      </p>

      {steps && <div className="max-w-md mx-auto mb-6 text-left bg-muted/50 rounded-lg p-4">
          <ol className="space-y-3">
            {steps.map((step, index) => <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground pt-0.5">{step}</span>
              </li>)}
          </ol>
        </div>}

      {benefits && <div className="max-w-md mx-auto mb-6">
          <ul className="space-y-2 text-left">
            {benefits.map((benefit, index) => <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </li>)}
          </ul>
        </div>}

      {tip}
      
      {action && onAction && <Button onClick={onAction} size="lg" className="hover:-translate-y-0.5 active:scale-[0.98]">
          {action}
        </Button>}

      {helpLink && <Link to={helpLink} className="mt-4 text-sm text-primary hover:underline">
          Learn more →
        </Link>}
    </div>;
};
interface SmartLoadingStateProps {
  message: string;
  timeout?: number;
  slowMessage?: string;
  actionAfterTimeout?: {
    label: string;
    alternativeLabel: string;
    onAlternative: () => void;
  };
  className?: string;
}
export const SmartLoadingState: React.FC<SmartLoadingStateProps> = ({
  message,
  timeout = 5000,
  slowMessage,
  actionAfterTimeout,
  className
}) => {
  const [showSlow, setShowSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSlow(true);
    }, timeout);
    return () => clearTimeout(timer);
  }, [timeout]);
  return <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl animate-pulse" />
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>

      <p className="text-lg font-medium text-foreground mb-2">{message}</p>

      {showSlow && slowMessage && <div className="mt-4 max-w-md animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">{slowMessage}</p>
          {actionAfterTimeout && <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={actionAfterTimeout.onAlternative}>
                {actionAfterTimeout.alternativeLabel}
              </Button>
            </div>}
        </div>}
    </div>;
};
interface FriendlyErrorStateProps {
  type: 'offline' | 'timeout' | 'permission' | 'not-found' | 'rate-limit' | 'generic';
  icon?: LucideIcon;
  title?: string;
  message?: string;
  primaryAction?: string | {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: string | {
    label: string;
    onClick: () => void;
  };
  tertiaryAction?: string | {
    label: string;
    onClick: () => void;
  };
  canRetry?: boolean;
  onRetry?: () => void;
  showStatus?: boolean;
  countdown?: number;
  errorId?: string;
  helpText?: string;
  className?: string;
}
export const FriendlyErrorState: React.FC<FriendlyErrorStateProps> = ({
  type,
  icon: CustomIcon,
  title: customTitle,
  message: customMessage,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  canRetry = true,
  onRetry,
  showStatus,
  countdown: initialCountdown,
  errorId,
  helpText,
  className
}) => {
  const [countdown, setCountdown] = useState(initialCountdown || 0);
  const [checking, setChecking] = useState(showStatus);
  useEffect(() => {
    if (initialCountdown && initialCountdown > 0) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [initialCountdown]);
  const config = {
    offline: {
      icon: WifiOff,
      title: "You're offline",
      message: "No worries! We'll reconnect automatically when you're back online.",
      primaryAction: null
    },
    timeout: {
      icon: Clock,
      title: "This is taking longer than expected",
      message: "Your request is still processing. You can wait or try again.",
      primaryAction: "Keep Waiting",
      secondaryAction: "Try Again",
      tertiaryAction: "Go Back"
    },
    permission: {
      icon: ShieldOff,
      title: "You don't have access to this",
      message: "This resource is only available to team admins. Need access? Contact your team leader.",
      primaryAction: "Contact Admin"
    },
    'not-found': {
      icon: FileQuestion,
      title: "This doesn't exist anymore",
      message: "It looks like this item was deleted or moved. Let's get you back on track.",
      primaryAction: "Go Back"
    },
    'rate-limit': {
      icon: Zap,
      title: "Whoa, slow down there!",
      message: "You're making changes really fast! Take a breath—you can try again in a few seconds.",
      primaryAction: countdown > 0 ? `Wait ${countdown}s` : "Try Again"
    },
    generic: {
      icon: AlertTriangle,
      title: "Something unexpected happened",
      message: "We've logged this error and will investigate. Meanwhile, try refreshing or go back.",
      primaryAction: "Refresh Page",
      secondaryAction: "Go to Dashboard"
    }
  };
  const typeConfig = config[type];
  const Icon = CustomIcon || typeConfig.icon;
  const title = customTitle || typeConfig.title;
  const message = customMessage || typeConfig.message;
  const handlePrimaryAction = () => {
    if (typeof primaryAction === 'object' && primaryAction.onClick) {
      primaryAction.onClick();
    } else if (type === 'timeout') {
      // Keep waiting - do nothing
    } else if (type === 'generic') {
      window.location.reload();
    } else if (onRetry && canRetry) {
      onRetry();
    }
  };
  const handleSecondaryAction = () => {
    if (typeof secondaryAction === 'object' && secondaryAction.onClick) {
      secondaryAction.onClick();
    } else if (onRetry && canRetry) {
      onRetry();
    }
  };
  return <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-destructive/5 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-destructive/10 backdrop-blur-sm rounded-full p-6 ring-1 ring-destructive/10">
          <Icon className="h-12 w-12 text-destructive/60" strokeWidth={2} />
        </div>
      </div>

      <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-base text-muted-foreground max-w-md mx-auto mb-6">
        {message}
      </p>

      {checking && <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Checking connection...
        </div>}

      <div className="flex flex-wrap gap-3 justify-center">
        {primaryAction && countdown === 0 && <Button onClick={handlePrimaryAction} size="lg">
            {typeof primaryAction === 'string' ? primaryAction : primaryAction.label}
          </Button>}
        {primaryAction && countdown > 0 && type === 'rate-limit' && <Button disabled size="lg">
            Wait {countdown}s
          </Button>}
        {secondaryAction && <Button variant="outline" onClick={handleSecondaryAction} size="lg">
            {typeof secondaryAction === 'string' ? secondaryAction : secondaryAction.label}
          </Button>}
        {tertiaryAction && typeof tertiaryAction === 'object' && <Button variant="ghost" onClick={tertiaryAction.onClick}>
            {tertiaryAction.label}
          </Button>}
      </div>

      {helpText && <p className="mt-6 text-sm text-muted-foreground">
          {helpText}
        </p>}

      {errorId && <p className="mt-4 text-xs text-muted-foreground font-mono">
          Error ID: {errorId}
        </p>}
    </div>;
};
interface InfoStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  showCountdown?: boolean;
  countdownMinutes?: number;
  notifyAction?: string;
  onNotify?: () => void;
  alternativeAction?: string;
  onAlternative?: () => void;
  className?: string;
}
export const InfoState: React.FC<InfoStateProps> = ({
  icon: Icon,
  title,
  message,
  action,
  onAction,
  dismissible,
  onDismiss,
  showCountdown,
  countdownMinutes = 10,
  notifyAction,
  onNotify,
  alternativeAction,
  onAlternative,
  className
}) => {
  const [timeLeft, setTimeLeft] = useState(countdownMinutes * 60);
  useEffect(() => {
    if (showCountdown) {
      const interval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showCountdown]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-accent/5 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-accent/10 backdrop-blur-sm rounded-full p-6 ring-1 ring-accent/10">
          <Icon className="h-12 w-12 text-accent-foreground/60" strokeWidth={2} />
        </div>
      </div>

      <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-base text-muted-foreground max-w-md mx-auto mb-6">
        {message}
      </p>

      {showCountdown && <div className="mb-6 text-3xl font-bold text-primary">
          {formatTime(timeLeft)}
        </div>}

      <div className="flex flex-wrap gap-3 justify-center">
        {action && onAction && <Button onClick={onAction} size="lg">
            {action}
          </Button>}
        {notifyAction && onNotify && <Button onClick={onNotify} variant="outline" size="lg">
            {notifyAction}
          </Button>}
        {alternativeAction && onAlternative && <Button onClick={onAlternative} variant="outline">
            {alternativeAction}
          </Button>}
        {dismissible && onDismiss && <Button onClick={onDismiss} variant="ghost">
            Dismiss
          </Button>}
      </div>
    </div>;
};
interface EmptySearchResultsProps {
  query: string;
  filters?: Record<string, any>;
  message?: string;
  suggestions?: string[];
  action?: string;
  onAction?: () => void;
  className?: string;
}
export const EmptySearchResults: React.FC<EmptySearchResultsProps> = ({
  query,
  filters,
  message,
  suggestions = ["Try removing some filters", "Check your spelling", "Use broader search terms"],
  action = "Clear Filters",
  onAction,
  className
}) => {
  const hasFilters = filters && Object.keys(filters).length > 0;
  return <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      <div className="text-6xl mb-4">🔍</div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {message || `No matches for "${query}"`}
      </h3>
      
      <div className="max-w-md mx-auto mb-6">
        <p className="text-sm text-muted-foreground mb-4">Try these tips:</p>
        <ul className="space-y-2 text-left">
          {suggestions.map((suggestion, index) => <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{suggestion}</span>
            </li>)}
        </ul>
      </div>

      {hasFilters && onAction && <Button onClick={onAction} variant="outline">
          {action}
        </Button>}
    </div>;
};