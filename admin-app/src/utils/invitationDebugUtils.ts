
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InvitationDebugInfo {
  url: string;
  urlParams: Record<string, string>;
  authState: {
    hasSession: boolean;
    userId?: string;
    email?: string;
    error?: string;
  };
  userAgent: string;
  timestamp: string;
  validationResults: {
    hasRequiredParams: boolean;
    missingParams: string[];
    paramCount: number;
  };
}

export const gatherDebugInfo = async (): Promise<InvitationDebugInfo> => {
  // Get URL parameters
  const urlParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());
  
  // Check auth state
  let authState: { hasSession: boolean; userId?: string; email?: string; error?: string } = { hasSession: false };
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    authState = {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      error: error?.message
    };
  } catch (error) {
    authState = {
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Validate parameters
  const requiredParams = ['type', 'email'];
  const missingParams = requiredParams.filter(param => !urlParams[param]);

  return {
    url: window.location.href,
    urlParams,
    authState,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    validationResults: {
      hasRequiredParams: missingParams.length === 0,
      missingParams,
      paramCount: Object.keys(urlParams).length
    }
  };
};

export const logInvitationFlow = (stage: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `🎫 [${timestamp}] Invitation Flow - ${stage}`;
  
  if (data) {
    logger.log(logMessage, data);
  } else {
    logger.log(logMessage);
  }
};

export const createDetailedErrorLog = (error: any, context: string) => {
  return {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error?.message || 'Unknown error',
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    },
    url: window.location.href,
    userAgent: navigator.userAgent
  };
};
