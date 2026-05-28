import { logger } from '@/utils/logger';
interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  canRetry: boolean;
  type: 'offline' | 'timeout' | 'permission' | 'not-found' | 'rate-limit' | 'generic';
}

export const handleError = (error: any, context: string = 'operation'): FriendlyError => {
  logger.error(`Error in ${context}:`, error);

  // Network errors
  if (!navigator.onLine || error?.message?.includes('Network') || error?.message?.includes('Failed to fetch')) {
    return {
      title: "You're offline",
      message: "Check your internet connection and try again.",
      canRetry: true,
      type: 'offline'
    };
  }

  // Timeout errors
  if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
    return {
      title: "Request timed out",
      message: "The server is taking too long to respond. Try again?",
      canRetry: true,
      type: 'timeout'
    };
  }

  // Supabase/Postgres errors
  const errorCode = error?.code || error?.error?.code;
  const errorMessage = error?.message || error?.error?.message || '';

  // Not found (404)
  if (errorCode === 'PGRST116' || errorMessage.includes('not found') || error?.status === 404) {
    return {
      title: "Not found",
      message: "This item doesn't exist or was deleted.",
      action: "Go back",
      canRetry: false,
      type: 'not-found'
    };
  }

  // Permission denied (403)
  if (errorCode === 'PGRST301' || errorMessage.includes('permission') || error?.status === 403) {
    return {
      title: "No access",
      message: "You don't have permission to view this. Contact your admin if you need access.",
      action: "Contact admin",
      canRetry: false,
      type: 'permission'
    };
  }

  // Rate limiting (429)
  if (error?.status === 429 || errorMessage.includes('rate limit')) {
    return {
      title: "Too many requests",
      message: "You're making changes too quickly. Please wait a moment and try again.",
      canRetry: true,
      type: 'rate-limit'
    };
  }

  // Authentication errors (401)
  if (error?.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
    return {
      title: "Session expired",
      message: "Please log in again to continue.",
      action: "Log in",
      canRetry: false,
      type: 'permission'
    };
  }

  // Server errors (500+)
  if (error?.status >= 500 || errorCode?.startsWith('50')) {
    return {
      title: "Server error",
      message: "Something went wrong on our end. We've been notified and are looking into it.",
      canRetry: true,
      type: 'generic'
    };
  }

  // Validation errors (400)
  if (error?.status === 400 || errorCode === '400') {
    return {
      title: "Invalid request",
      message: errorMessage || "The information you provided isn't quite right. Please check and try again.",
      canRetry: false,
      type: 'generic'
    };
  }

  // Generic error fallback
  return {
    title: "Something went wrong",
    message: "An unexpected error occurred. Try refreshing the page or contact support if this persists.",
    action: "Refresh page",
    canRetry: true,
    type: 'generic'
  };
};

export const getErrorId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ERR-${timestamp}-${random}`;
};
