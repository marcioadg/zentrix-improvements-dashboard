import { logger } from '@/utils/logger';
// Stripe configuration
// Publishable keys are safe to expose in frontend code

// Keys organized by account
const STRIPE_KEYS = {
  old: {
    publishableKeyTest: 'pk_test_51S2ugE68C1gbVF0CeIgH0XN9smuzvg18wwArGYjhQ4NZ6kXQqafJCmDPhah3PMBakul7nR3drpJqJfkIpNDbqqWr00XkoyTNLW',
    publishableKeyLive: 'pk_live_51S2ugE68C1gbVF0CH1l1LzTEavYndmGVUHbvrwa1nH9j1nLf2xfn8BEWB3PtGiRgl4eZa3jsSzTy7aItncvDfnlI00R4rb1Nz2',
    priceIds: {
      test: 'price_1SBTI768C1gbVF0C0qS9ISIH', // $5/month per seat
      live: 'price_1SBpBW68C1gbVF0C1mWvPHeh'
    }
  },
  new: {
    publishableKeyTest: 'pk_test_51SYf824lZIs3l3pbuzQCuno7G4487CEpUk1lBRIxNzsu7bRzljCrcl7NyCuO2O9jHg2Ne3azZIfspnHXhDAJqb5000Wv3b4ZOX',
    publishableKeyLive: 'pk_live_51SYf824lZIs3l3pbFws0qET6VNb0XPp2nmyZhSVoApjl2VN4PThMiPk5wOCova0oxamZHwxzwml8gY4x8HEDPE0900jd85fDsM',
    priceIds: {
      test: 'price_1THn6J4lZIs3l3pbpDc6XgDc', // $5/month per seat (new account)
      live: 'price_1TK1524lZIs3l3pban5u7qe8'
    }
  }
};

export const STRIPE_CONFIG = {
  // Database mode + account cache
  _dbMode: null as 'test' | 'live' | null,
  _dbAccount: null as 'old' | 'new' | null,
  _dbModePromise: null as Promise<{ mode: 'test' | 'live'; account: 'old' | 'new' }> | null,

  // Fetch mode and account from database
  async fetchDatabaseSettings(): Promise<{ mode: 'test' | 'live'; account: 'old' | 'new' }> {
    if (this._dbModePromise) {
      logger.log('[STRIPE_CONFIG] Returning cached database settings fetch');
      return this._dbModePromise;
    }

    this._dbModePromise = (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const [modeResult, accountResult] = await Promise.all([
          supabase.rpc('get_stripe_mode'),
          supabase.rpc('get_stripe_account')
        ]);

        const mode = (modeResult.error ? 'test' : (modeResult.data as 'test' | 'live')) || 'test';
        const account = (accountResult.error ? 'old' : (accountResult.data as 'old' | 'new')) || 'old';

        logger.log('[STRIPE_CONFIG] Database settings fetched:', { mode, account });
        this._dbMode = mode;
        this._dbAccount = account;
        return { mode, account };
      } catch (err) {
        logger.error('[STRIPE_CONFIG] Exception fetching database settings:', err);
        return { mode: 'test' as const, account: 'old' as const };
      } finally {
        setTimeout(() => {
          this._dbModePromise = null;
        }, 100);
      }
    })();

    return this._dbModePromise;
  },

  // Keep backward compatibility
  async fetchDatabaseMode(): Promise<'test' | 'live'> {
    const { mode } = await this.fetchDatabaseSettings();
    return mode;
  },

  // Get publishable key based on database mode + account
  async getPublishableKey(): Promise<string> {
    const { mode, account } = await this.fetchDatabaseSettings();
    const keys = STRIPE_KEYS[account];
    const key = mode === 'live' ? keys.publishableKeyLive : keys.publishableKeyTest;

    // Fall back to old account if new account key is empty
    if (!key && account === 'new') {
      logger.warn('[STRIPE_CONFIG] New account key not configured, falling back to old account');
      const oldKeys = STRIPE_KEYS.old;
      return mode === 'live' ? oldKeys.publishableKeyLive : oldKeys.publishableKeyTest;
    }

    logger.log('[STRIPE_CONFIG] Using publishable key for:', { mode, account });
    return key;
  },

  // Synchronous publishable key (uses cached values)
  get publishableKey() {
    const account = this._dbAccount || 'old';
    const keys = STRIPE_KEYS[account];

    if (this._dbMode) {
      logger.log('[STRIPE_CONFIG] Using cached settings:', { mode: this._dbMode, account });
      const key = this._dbMode === 'live' ? keys.publishableKeyLive : keys.publishableKeyTest;
      if (key) return key;
      // Fall back to old if new key is empty
      const oldKeys = STRIPE_KEYS.old;
      return this._dbMode === 'live' ? oldKeys.publishableKeyLive : oldKeys.publishableKeyTest;
    }

    // Fallback to hostname-based detection (always old account)
    const isDevelopment = typeof window !== 'undefined' && (
      window.location.hostname.includes('lovable') ||
      window.location.hostname.includes('localhost') ||
      window.location.hostname.includes('127.0.0.1') ||
      window.location.hostname.includes('preview')
    );

    const useTestMode = isDevelopment;

    logger.log('[STRIPE_CONFIG] Environment check (fallback):', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
      isDevelopment,
      usingTestMode: useTestMode
    });

    return useTestMode ? STRIPE_KEYS.old.publishableKeyTest : STRIPE_KEYS.old.publishableKeyLive;
  },

  // Get current environment
  get environment(): 'test' | 'live' {
    if (this._dbMode) {
      return this._dbMode;
    }
    return this.publishableKey === STRIPE_KEYS.old.publishableKeyLive ? 'live' : 'test';
  },

  // Initialize with database mode
  async initializeWithDatabaseMode(dbMode: 'test' | 'live' | null) {
    const account = this._dbAccount || 'old';
    const keys = STRIPE_KEYS[account];

    if (dbMode === 'live') {
      logger.log('[STRIPE_CONFIG] Using LIVE mode from database setting');
      return keys.publishableKeyLive || STRIPE_KEYS.old.publishableKeyLive;
    } else if (dbMode === 'test') {
      logger.log('[STRIPE_CONFIG] Using TEST mode from database setting');
      return keys.publishableKeyTest || STRIPE_KEYS.old.publishableKeyTest;
    }
    return this.publishableKey;
  },

  // Get current price ID based on environment + account
  get currentPriceId() {
    const account = this._dbAccount || 'old';
    const prices = STRIPE_KEYS[account].priceIds;
    const priceId = this.environment === 'live' ? prices.live : prices.test;
    // Fall back to old account if new price is empty
    if (!priceId && account === 'new') {
      return this.environment === 'live' ? STRIPE_KEYS.old.priceIds.live : STRIPE_KEYS.old.priceIds.test;
    }
    return priceId;
  },

  // Expose price IDs for backward compatibility
  get priceIds() {
    const account = this._dbAccount || 'old';
    return STRIPE_KEYS[account].priceIds;
  }
} as const;
