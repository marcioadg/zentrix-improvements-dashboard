
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { companyDataValidationService, ValidationResult } from '@/services/companyDataValidationService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const CompanyDataDebugger: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const runValidation = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await companyDataValidationService.validateUserCompanyData(user.id);
      setValidationResult(result);
      
      if (result.isValid) {
        toast({
          title: "Validation Complete",
          description: "No data inconsistencies found",
        });
      } else {
        toast({
          title: "Inconsistencies Found",
          description: `Found ${result.inconsistencies.length} issues`,
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Validation failed:', error);
      toast({
        title: "Validation Failed",
        description: "Could not validate company data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fixInconsistencies = async () => {
    if (!user) return;

    setFixing(true);
    try {
      const result = await companyDataValidationService.fixDataInconsistencies(user.id);
      
      if (result.success) {
        toast({
          title: "Fixes Applied",
          description: result.message,
        });
        
        // Re-run validation to show updated state
        await runValidation();
      } else {
        toast({
          title: "Fix Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Fix failed:', error);
      toast({
        title: "Fix Failed",
        description: "Could not fix inconsistencies",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    if (isOpen && user && !validationResult) {
      runValidation();
    }
  }, [isOpen, user]);

  if (!user) return null;

  return (
    <Card className="mb-4 border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-sm">Company Data Debugger</CardTitle>
                </div>
                {validationResult && (
                  <Badge 
                    variant={validationResult.isValid ? "secondary" : "destructive"} 
                    className={validationResult.isValid ? "bg-success/10 text-green-800 border-green-300" : ""}>
                    {validationResult.isValid ? "Valid" : `${validationResult.inconsistencies.length} Issues`}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    runValidation();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Validate
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Debug company data consistency between UI and database
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {validationResult && (
              <div className="space-y-4">
                {/* Overall Status */}
                <Alert className={validationResult.isValid ? "border-green-200 bg-success/5" : "border-red-200 bg-destructive/5"}>
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <AlertDescription className="text-sm">
                      {validationResult.isValid 
                        ? "All company data is consistent between UI and database"
                        : `Found ${validationResult.inconsistencies.length} data inconsistencies`
                      }
                    </AlertDescription>
                  </div>
                </Alert>

                {/* Inconsistencies */}
                {validationResult.inconsistencies.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-destructive">Issues Found</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fixInconsistencies}
                        disabled={fixing}
                      >
                        <Wrench className={`h-3 w-3 mr-1 ${fixing ? 'animate-spin' : ''}`} />
                        Auto-Fix
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {validationResult.inconsistencies.map((issue, index) => (
                        <Alert key={index} className="border-orange-200 bg-orange-50">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <AlertDescription className="text-xs">{issue}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Validating company data...</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
