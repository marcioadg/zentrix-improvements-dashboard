
import { Star } from 'lucide-react';
import React from 'react';

export const formatElapsedTime = (startedAt: string): string => {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

export const formatCompletedDate = (endedAt: string): string => {
  const date = new Date(endedAt);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const renderRating = (rating?: number): React.ReactElement => {
  if (!rating) {
    return React.createElement('span', { className: 'text-xs text-muted-foreground' }, 'No rating');
  }
  
  return React.createElement('div', { className: 'flex items-center gap-1' }, [
    React.createElement(Star, { key: 'star', className: 'h-3 w-3 fill-yellow-400 text-yellow-400' }),
    React.createElement('span', { key: 'rating', className: 'text-xs font-medium' }, rating.toFixed(1))
  ]);
};
