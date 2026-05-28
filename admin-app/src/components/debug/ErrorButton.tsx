import React from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Development-only component for testing Sentry error reporting
 * This component should never appear in production builds
 */
export const ErrorButton: React.FC = () => {
  // Hidden for better UX - Sentry functionality remains unaffected
  return null;
};