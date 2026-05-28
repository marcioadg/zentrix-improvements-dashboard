import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CheckoutFormProps {
  setupIntentClientSecret: string;
  customerId: string;
  companyId: string;
  trialEndTimestamp: number;
  meteredPriceId: string;
}

export function CheckoutForm({ 
  setupIntentClientSecret, 
  customerId, 
  companyId, 
  trialEndTimestamp,
  meteredPriceId 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);

  // Track Stripe Elements initialization
  useEffect(() => {
    if (stripe && elements) {
      logger.debug('Stripe Elements initialized');
    }
  }, [stripe, elements]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Submit the elements form first (required by Stripe)
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm setup intent to collect payment method
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: setupIntentClientSecret,
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!setupIntent) {
        throw new Error('Setup intent was not returned from Stripe');
      }

      if (setupIntent.status === 'succeeded') {
        const { data, error: authError } = await supabase.auth.getSession();

        if (authError || !data.session) {
          logger.error('Authentication failed during checkout:', authError);
          throw new Error('Authentication required');
        }

        const response = await supabase.functions.invoke('os-create-subscription', {
          body: {
            payment_method_id: setupIntent.payment_method,
            customer_id: customerId,
            company_id: companyId,
            trial_end_timestamp: trialEndTimestamp,
            metered_price_id: meteredPriceId
          }
        });

        if (response.error) {
          logger.error('Create-subscription failed:', response.error);
          throw new Error(response.error.message || 'Failed to create subscription');
        }

        // Handle duplicate subscription error (409 from backend)
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        // Handle reactivation of pending-cancellation subscription
        if (response.data?.reactivated) {
          setIsSuccess(true);
          setMessage('Your subscription has been reactivated! No new charge needed.');
          setTimeout(() => {
            window.location.href = '/settings?tab=billing&success=true';
          }, 2000);
          return;
        }

        setIsSuccess(true);
        setMessage('Subscription created successfully! Your trial will continue until the end of the trial period.');
        
        // Redirect to billing page after success
        setTimeout(() => {
          window.location.href = '/settings?tab=billing&success=true';
        }, 2000);
      } else {
        // Handle different setup intent statuses explicitly
        if (setupIntent.status === 'requires_payment_method') {
          throw new Error('Payment method is required. Please try again.');
        } else if (setupIntent.status === 'requires_confirmation') {
          throw new Error('Payment confirmation required. Please try again.');
        } else if (setupIntent.status === 'requires_action') {
          throw new Error('Additional action required. Please complete the payment authentication.');
        } else if (setupIntent.status === 'processing') {
          throw new Error('Payment is still processing. Please wait a moment and try again.');
        } else if (setupIntent.status === 'canceled') {
          throw new Error('Payment was canceled. Please try again.');
        } else {
          throw new Error(`Payment failed with status: ${setupIntent.status}. Please try again.`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setMessage(errorMessage);
      logger.error('Subscription creation error:', error);
    }

    setIsLoading(false);
  };

  // Check URL for success parameter on component mount
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSucceeded = urlParams.get('success') === 'true';

  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground">Thank you for your payment. Your transaction has been completed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 border border-border rounded-lg bg-card/50 relative">
        {!isElementsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading payment form...</span>
            </div>
          </div>
        )}
        <PaymentElement 
          onReady={() => setIsElementsReady(true)}
          onLoadError={(error) => {
            logger.error('PaymentElement load error:', error);
            setMessage('Failed to load payment form. Please refresh the page.');
          }}
          options={{
            layout: 'accordion',
            paymentMethodOrder: ['card'],
            fields: {
              billingDetails: 'auto'
            }
          }}
        />
      </div>
      
      {message && (
        <Alert variant={isSuccess ? "default" : "destructive"} className="border-l-4">
          {isSuccess ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className="font-medium">{message}</AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        disabled={isLoading || !stripe || !elements || !isElementsReady}
        className="w-full h-12 text-base font-medium"
        size="lg"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Setting up subscription...</span>
          </div>
        ) : !isElementsReady ? (
          'Loading payment form...'
        ) : (
          'Set up payment method'
        )}
      </Button>
      
      <div className="space-y-2 text-sm text-muted-foreground text-center bg-muted/30 p-4 rounded-lg">
        <p className="font-medium">💳 Trial continues until it expires</p>
        <p>Your card will be charged based on usage at the end of your trial period.</p>
        <p className="text-xs">You can cancel anytime from your billing settings.</p>
      </div>
    </form>
  );
}