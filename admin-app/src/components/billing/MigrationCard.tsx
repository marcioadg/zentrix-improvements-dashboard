import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useMultiCompany } from "@/contexts/MultiCompanyContext";
import { logger } from '@/utils/logger';

export const BillingMigrationCard = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const { toast } = useToast();
  const { subscription, checkSubscription } = useSubscription();
  const { currentCompany } = useMultiCompany();

  // Only show for usage-based billing
  if (!subscription || subscription.billing_type !== 'usage_based') {
    return null;
  }

  const handleMigration = async () => {
    if (!currentCompany?.id) return;

    setIsMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-to-per-seat', {
        body: { company_id: currentCompany?.id }
      });

      if (error) throw error;

      setMigrationResult(data);
      await checkSubscription();
      
      toast({
        title: "Migration Successful!",
        description: "Your billing has been migrated to per-seat pricing.",
      });
    } catch (error) {
      logger.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to migrate billing",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (migrationResult?.success) {
    return (
      <Card className="border-green-200 bg-success/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <CardTitle className="text-green-800">Migration Complete!</CardTitle>
          </div>
          <CardDescription className="text-success">
            Your billing has been successfully migrated to simplified per-seat pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>New Billing Type:</span>
              <Badge variant="secondary">Per-Seat</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Current Seats:</span>
              <span className="font-medium">{migrationResult.quantity || migrationResult.user_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Monthly Cost:</span>
              <span className="font-medium">${((migrationResult.quantity || migrationResult.user_count) * 5).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-blue-800">Upgrade to Simplified Billing</CardTitle>
        </div>
        <CardDescription className="text-primary">
          We're simplifying our billing! Migrate from usage-based to straightforward per-seat pricing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Current: Usage-Based</p>
              <p className="text-xs text-muted-foreground">Complex calculations</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">New: Per-Seat</p>
              <p className="text-xs text-muted-foreground">$5/month per active user</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm">Benefits of Per-Seat Billing:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Predictable monthly costs</li>
              <li>• Simpler to understand and manage</li>
              <li>• No complex usage calculations</li>
              <li>• Same great features</li>
            </ul>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Current Active Users:</span>
            <span className="font-medium">{subscription.user_count || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Estimated Monthly Cost:</span>
            <span className="font-medium">${((subscription.user_count || 1) * 5).toFixed(2)}</span>
          </div>
        </div>

        <Button 
          onClick={handleMigration} 
          disabled={isMigrating}
          className="w-full"
        >
          {isMigrating ? "Migrating..." : "Migrate to Per-Seat Billing"}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Your existing customer ID and payment method will be preserved.
        </p>
      </CardContent>
    </Card>
  );
};