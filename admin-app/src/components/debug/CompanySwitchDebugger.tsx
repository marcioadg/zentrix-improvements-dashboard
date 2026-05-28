
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { companyDataValidationService } from '@/services/companyDataValidationService';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface CompanyDebugInfo {
  profileCompanyId: string | null;
  currentCompanyId: string | null;
  memberships: Array<{ company_id: string; role: string; company_name: string }>;
  validationResult: { isValid: boolean; inconsistencies: string[] };
}

export const CompanySwitchDebugger = () => {
  const { user } = useAuth();
  const { currentCompany, companies, switchCompany } = useMultiCompany();
  const [debugInfo, setDebugInfo] = useState<CompanyDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDebugInfo = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get profile company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      // Get current company setting
      const { data: settings } = await supabase
        .from('user_settings')
        .select('current_company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get memberships with company names
      const { data: memberships } = await supabase
        .from('company_members')
        .select(`
          company_id,
          role,
          companies(name)
        `)
        .eq('user_id', user.id);

      // Validate data
      const validationResult = await companyDataValidationService.validateUserCompanyData(user.id);

      setDebugInfo({
        profileCompanyId: profile?.company_id || null,
        currentCompanyId: settings?.current_company_id || null,
        memberships: (memberships || []).map(m => ({
          company_id: m.company_id,
          role: m.role,
          company_name: Array.isArray(m.companies) ? 'Unknown' : (m.companies as any)?.name || 'Unknown'
        })),
        validationResult
      });
    } catch (error) {
      logger.error('Failed to load debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixInconsistencies = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await companyDataValidationService.fixDataInconsistencies(user.id);
      if (result.success) {
        await loadDebugInfo();
      }
    } catch (error) {
      logger.error('Failed to fix inconsistencies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, [user, currentCompany]);

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Company Switch Debugger
          <Button
            size="sm"
            variant="outline"
            onClick={loadDebugInfo}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Debug information for company switching functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div>
          <h4 className="font-semibold mb-2">Current State</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Selected Company:</strong> {currentCompany?.name || 'None'}</p>
            <p><strong>Available Companies:</strong> {companies.length}</p>
          </div>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <>
            <div>
              <h4 className="font-semibold mb-2">Database State</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Profile Company ID:</strong> {debugInfo.profileCompanyId || 'None'}</p>
                <p><strong>Current Company ID:</strong> {debugInfo.currentCompanyId || 'None'}</p>
                <p><strong>Company Memberships:</strong> {debugInfo.memberships.length}</p>
              </div>
            </div>

            {/* Memberships */}
            <div>
              <h4 className="font-semibold mb-2">Company Memberships</h4>
              <div className="space-y-1">
                {debugInfo.memberships.map((membership, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{membership.role}</Badge>
                    <span>{membership.company_name}</span>
                    <span className="text-muted-foreground">({membership.company_id.slice(0, 8)}...)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Results */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                Validation Status
                {debugInfo.validationResult.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </h4>
              {!debugInfo.validationResult.isValid && (
                <div className="space-y-1">
                  {debugInfo.validationResult.inconsistencies.map((issue, index) => (
                    <p key={index} className="text-sm text-destructive">• {issue}</p>
                  ))}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={fixInconsistencies}
                    disabled={loading}
                    className="mt-2"
                  >
                    Fix Inconsistencies
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Company Switch Test */}
        <div>
          <h4 className="font-semibold mb-2">Test Company Switching</h4>
          <div className="flex flex-wrap gap-2">
            {companies.map((company) => (
              <Button
                key={company.id}
                size="sm"
                variant={currentCompany?.id === company.id ? "default" : "outline"}
                onClick={() => switchCompany(company.id)}
                disabled={loading}
              >
                {company.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
