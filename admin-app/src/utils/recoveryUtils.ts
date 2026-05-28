// Recovery flow detection utilities
export const isInRecoveryFlow = (): boolean => {
  try {
    // Check multiple indicators for recovery context
    return (
      sessionStorage.getItem('password_recovery_initiated') === 'true' ||
      window.location.pathname === '/reset-password' ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery') ||
      // Check for recovery session patterns
      document.referrer.includes('/auth/callback') && 
        (window.location.hash.includes('access_token') || window.location.search.includes('access_token'))
    );
  } catch {
    return false;
  }
};

export const clearRecoveryFlags = (): void => {
  try {
    sessionStorage.removeItem('password_recovery_initiated');
  } catch {
    // Ignore storage errors
  }
};

export const setRecoveryFlag = (): void => {
  try {
    sessionStorage.setItem('password_recovery_initiated', 'true');
  } catch {
    // Ignore storage errors
  }
};