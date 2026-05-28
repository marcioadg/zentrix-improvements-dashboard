import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity: number;
  proration: boolean;
  period: {
    start: string | null;
    end: string | null;
  };
}

interface InvoiceData {
  amount_due: number;
  currency: string;
  period_start: string;
  period_end: string;
  lines: InvoiceLineItem[];
  subtotal: number;
  total: number;
  subscription_tier: string;
}

export const useInvoicePreview = () => {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const { toast } = useToast();

  const previewInvoice = async (companyId: string) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Please select a company",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setInvoice(null);

    try {
      logger.log('[Invoice Preview] Calling edge function for company:', companyId);

      const { data, error } = await supabase.functions.invoke('preview-invoice', {
        body: { companyId },
      });

      logger.log('[Invoice Preview] Edge function response:', { data, error });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to preview invoice');
      }

      setInvoice(data.invoice);
      toast({
        title: "Invoice Preview Retrieved",
        description: "Successfully loaded upcoming invoice data",
      });

    } catch (error) {
      logger.error('[Invoice Preview] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to preview invoice';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const clearInvoice = () => {
    setInvoice(null);
  };

  return {
    previewInvoice,
    clearInvoice,
    invoice,
    loading,
  };
};
