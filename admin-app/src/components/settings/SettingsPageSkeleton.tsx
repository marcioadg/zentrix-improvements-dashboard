import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsPageSkeletonProps {
  variant?: 'desktop' | 'mobile';
  showVoting?: boolean;
  className?: string;
}

// Shimmer overlay component for enhanced loading effect
const ShimmerOverlay: React.FC<{ className?: string }> = ({ className }) => (
  <div 
    className={cn(
      "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/60 to-transparent",
      "animate-[shimmer_2s_infinite]",
      className
    )} 
    aria-hidden="true"
  />
);

// Profile Settings Section Skeleton
const ProfileSettingsSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <Card className="relative overflow-hidden">
    <ShimmerOverlay />
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-32" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-64" />
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Avatar Section */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className={cn("flex gap-4", isMobile ? "flex-col items-center" : "items-center")}>
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-20" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        
        {/* Drag and Drop Area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20">
          <Skeleton className="h-8 w-8 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>

      {/* Name Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Email Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3 w-56" />
      </div>
    </CardContent>
  </Card>
);

// Company Settings Section Skeleton
const CompanySettingsSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <Card className="relative overflow-hidden">
    <ShimmerOverlay />
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-36" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-72" />
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Auto-create Issues Setting */}
      <div className="space-y-2">
        <div className={cn("flex justify-between", isMobile ? "flex-col gap-3" : "items-center")}>
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <Skeleton className="h-3 w-72" />
      </div>

      {/* Company Name Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Company ID Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Company Slug Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-3 w-56" />
      </div>
    </CardContent>
  </Card>
);

// Voting Settings Section Skeleton
const VotingSettingsSkeleton: React.FC = () => (
  <Card className="relative overflow-hidden">
    <ShimmerOverlay />
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-80" />
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-md space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Page Header Skeleton
const PageHeaderSkeleton: React.FC = () => (
  <div className="space-y-2">
    <Skeleton className="h-9 w-32" />
    <Skeleton className="h-5 w-80" />
  </div>
);

// Main Settings Page Skeleton
export const SettingsPageSkeleton: React.FC<SettingsPageSkeletonProps> = ({ 
  variant = 'desktop',
  showVoting = true,
  className 
}) => {
  const isMobile = variant === 'mobile';

  return (
    <div 
      className={cn("container mx-auto py-8 space-y-8 animate-fade-in", className)} 
      role="presentation" 
      aria-live="polite"
      aria-label="Loading settings page"
    >
      <PageHeaderSkeleton />

      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1")}>
        <ProfileSettingsSkeleton isMobile={isMobile} />
        <CompanySettingsSkeleton isMobile={isMobile} />
        {showVoting && <VotingSettingsSkeleton />}
      </div>
    </div>
  );
};

// Individual component skeletons for reuse
export const ProfileSettingsCardSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <ProfileSettingsSkeleton isMobile={isMobile} />
);

export const CompanySettingsCardSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
  <CompanySettingsSkeleton isMobile={isMobile} />
);

export const VotingSettingsCardSkeleton: React.FC = () => (
  <VotingSettingsSkeleton />
);

// Settings form field skeleton for reuse
export const SettingsFieldSkeleton: React.FC<{ 
  labelWidth?: string; 
  fieldType?: 'input' | 'switch' | 'textarea';
  showDescription?: boolean;
}> = ({ 
  labelWidth = 'w-24', 
  fieldType = 'input',
  showDescription = false 
}) => (
  <div className="space-y-2">
    <Skeleton className={cn("h-4", labelWidth)} />
    {fieldType === 'input' && <Skeleton className="h-10 w-full" />}
    {fieldType === 'switch' && (
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
    )}
    {fieldType === 'textarea' && <Skeleton className="h-24 w-full" />}
    {showDescription && <Skeleton className="h-3 w-56" />}
  </div>
);

// Settings action buttons skeleton
export const SettingsActionsSkeleton: React.FC<{ buttonCount?: number }> = ({ buttonCount = 2 }) => (
  <div className="flex gap-2 pt-4">
    {Array.from({ length: buttonCount }).map((_, index) => (
      <Skeleton key={index} className="h-10 w-20" />
    ))}
  </div>
);