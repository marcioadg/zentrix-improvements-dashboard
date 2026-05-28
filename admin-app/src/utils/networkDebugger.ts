
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface NetworkDebugInfo {
  timestamp: string;
  requestType: string;
  success: boolean;
  error?: string;
  duration: number;
  userContext?: {
    userId?: string;
    teamId?: string;
    companyId?: string;
  };
}

class NetworkDebugger {
  private logs: NetworkDebugInfo[] = [];
  private maxLogs = 50;

  public async debugQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    userContext?: { userId?: string; teamId?: string; companyId?: string }
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    logger.log(`🔍 NetworkDebugger: Starting ${queryName}`, { userContext, timestamp });
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      const debugInfo: NetworkDebugInfo = {
        timestamp,
        requestType: queryName,
        success: true,
        duration,
        userContext
      };
      
      this.addLog(debugInfo);
      logger.log(`✅ NetworkDebugger: ${queryName} succeeded`, { duration: `${duration.toFixed(2)}ms`, result });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const debugInfo: NetworkDebugInfo = {
        timestamp,
        requestType: queryName,
        success: false,
        error: errorMessage,
        duration,
        userContext
      };
      
      this.addLog(debugInfo);
      logger.error(`❌ NetworkDebugger: ${queryName} failed`, { 
        duration: `${duration.toFixed(2)}ms`, 
        error: errorMessage,
        userContext 
      });
      
      throw error;
    }
  }

  private addLog(log: NetworkDebugInfo) {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  public getLogs(): NetworkDebugInfo[] {
    return [...this.logs];
  }

  public getFailedRequests(): NetworkDebugInfo[] {
    return this.logs.filter(log => !log.success);
  }

  public clearLogs() {
    this.logs = [];
  }

  public async testUserAccess(userId: string): Promise<{ 
    hasProfile: boolean; 
    companies: any[]; 
    teams: any[]; 
    error?: string 
  }> {
    try {
      logger.log('🔍 NetworkDebugger: Testing user access for', userId);
      
      // Test profile access
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('❌ Profile access failed:', profileError);
        return { 
          hasProfile: false, 
          companies: [], 
          teams: [], 
          error: `Profile access failed: ${profileError.message}` 
        };
      }

      // Test company access
      const { data: companies, error: companiesError } = await supabase
        .from('company_members')
        .select(`
          role,
          companies:company_id(id, name)
        `)
        .eq('user_id', userId);

      // Test team access
      const { data: teams, error: teamsError } = await supabase
        .from('team_members')
        .select(`
          role,
          teams:team_id(id, name, company_id)
        `)
        .eq('user_id', userId);

      logger.log('✅ User access test completed', {
        profile: !!profile,
        companiesCount: companies?.length || 0,
        teamsCount: teams?.length || 0
      });

      return {
        hasProfile: !!profile,
        companies: companies || [],
        teams: teams || [],
        error: companiesError?.message || teamsError?.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ User access test failed:', errorMessage);
      return { 
        hasProfile: false, 
        companies: [], 
        teams: [], 
        error: errorMessage 
      };
    }
  }
}

export const networkDebugger = new NetworkDebugger();
