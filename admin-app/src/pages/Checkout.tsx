import { useEffect, useState, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CreditCard, Shield, Lock } from 'lucide-react';
import { Logo } from '@/components/AnimatedSidebarDemo';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';
import { logger } from '@/utils/logger';

// Initialize Stripe with database-driven mode
let stripePromiseCache: Promise<any> | null = null;

const getStripePromise = async () => {
  if (stripePromiseCache) {
    return stripePromiseCache;
  }
  
  // Fetch publishable key from database mode
  const publishableKey = await STRIPE_CONFIG.getPublishableKey();
  logger.log('[CHECKOUT] Using Stripe key from database mode');
  logger.log('[CHECKOUT] Stripe environment:', STRIPE_CONFIG.environment);
  
  stripePromiseCache = loadStripe(publishableKey);
  return stripePromiseCache;
};

interface CheckoutData {
  setup_intent_client_secret: string;
  customer_id: string;
  trial_end_timestamp: number;
  metered_price_id: string;
}

export default function Checkout() {
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const initializationRef = useRef(false);
  
  // APPLE APP STORE COMPLIANCE: Check if mobile platform or mobile-sized viewport (must be after hooks)
  const isMobileApp = isMobileOrTabletDevice();

  // Get current company from URL params or user settings
  const companyId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('company_id') || 'current';
  }, []);

  // Memoize Elements options to prevent unnecessary re-renders
  const elementsOptions = useMemo(() => {
    if (!checkoutData?.setup_intent_client_secret) {
      logger.log('[CHECKOUT] No setup intent client secret available');
      return null;
    }
    
    logger.log('[CHECKOUT] Creating Elements options for Setup Intent with client secret');
    return {
      clientSecret: checkoutData.setup_intent_client_secret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: 'hsl(var(--primary))',
        }
      },
    };
  }, [checkoutData?.setup_intent_client_secret]);

  // Initialize Stripe with database mode
  useEffect(() => {
    getStripePromise().then(setStripePromise).catch((err) => {
      logger.error('[CHECKOUT] Failed to initialize Stripe:', err);
      setError('Failed to load payment system. Please refresh the page.');
    });
  }, []);

  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (initializationRef.current) {
      return;
    }
    
    initializationRef.current = true;
    
    const initializeCheckout = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getSession();
        if (authError || !data.session) {
          throw new Error('Authentication required');
        }

        const response = await supabase.functions.invoke('os-create-checkout', {
          body: { company_id: companyId }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to initialize checkout');
        }

        // Handle duplicate subscription (409 from backend)
        if (response.data?.has_active_subscription) {
          throw new Error('You already have an active subscription. Please manage it through the billing portal.');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        if (response.data?.setup_intent_client_secret) {
          setCheckoutData(response.data);
        } else {
          throw new Error('No checkout data returned');
        }
      } catch (error) {
        logger.error('Checkout initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [companyId]);

  // Check URL params for success/cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    
    if (success === 'true' && !isMobileApp) {
      // Redirect to billing page on success
      window.location.href = '/settings?tab=billing&success=true';
    }
  }, [isMobileApp]);

  // APPLE APP STORE COMPLIANCE: Block mobile users from accessing checkout
  // This is placed after all hooks to satisfy React rules
  if (isMobileApp) {
    return <Navigate to="/m/tasks" replace />;
  }

  // Don't render until Stripe is initialized
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Initializing secure payment...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">Loading checkout...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">No checkout data available</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <Logo />
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Subscription</CardTitle>
            <p className="text-muted-foreground max-w-md mx-auto">
              Configure your payment method for usage-based billing. 
              You'll be charged $5 per active user per month starting after your trial period.
            </p>
            
            {/* Security badges */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!elementsOptions ? (
              <div className="text-center p-8">
                <div className="text-muted-foreground">Initializing payment form...</div>
                {loading && <div className="text-xs text-muted-foreground mt-2">Loading checkout data...</div>}
              </div>
            ) : (
              <Elements 
                stripe={stripePromise}
                options={elementsOptions}
              >
                <CheckoutForm 
                  setupIntentClientSecret={checkoutData.setup_intent_client_secret}
                  customerId={checkoutData.customer_id}
                  companyId={companyId}
                  trialEndTimestamp={checkoutData.trial_end_timestamp}
                  meteredPriceId={checkoutData.metered_price_id}
                />
              </Elements>
            )}
          </CardContent>
        </Card>
        
        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <strong>Stripe</strong> • Your payment information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
