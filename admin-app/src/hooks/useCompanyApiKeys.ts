import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_by: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// Generate a secure random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'zos_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hash function using Web Crypto API
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useCompanyApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();

  const fetchApiKeys = useCallback(async () => {
    if (!currentCompany?.id) {
      setApiKeys([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_api_keys')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the data since the table is new and types may not be generated yet
      setApiKeys((data || []) as ApiKey[]);
    } catch (error) {
      logger.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = async (name: string, expiresAt?: Date): Promise<string | null> => {
    if (!currentCompany?.id || !user?.id) {
      toast.error('No company or user context');
      return null;
    }

    setCreating(true);
    try {
      // Generate a new API key
      const plainKey = generateApiKey();
      const keyPrefix = plainKey.substring(0, 12); // zos_ + 8 chars
      const keyHash = await hashKey(plainKey);

      const { error } = await supabase
        .from('company_api_keys')
        .insert({
          company_id: currentCompany?.id,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: ['read', 'write'],
          created_by: user.id,
          expires_at: expiresAt?.toISOString() || null,
        });

      if (error) throw error;

      toast.success('API key created successfully');
      await fetchApiKeys();
      
      // Return the plain key (only shown once)
      return plainKey;
    } catch (error: any) {
      logger.error('Error creating API key:', error);
      toast.error(error.message || 'Failed to create API key');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;

      toast.success('API key revoked');
      await fetchApiKeys();
      return true;
    } catch (error) {
      logger.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
      return false;
    }
  };

  const deleteApiKey = async (keyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      toast.success('API key deleted');
      await fetchApiKeys();
      return true;
    } catch (error) {
      logger.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
      return false;
    }
  };

  return {
    apiKeys,
    loading,
    creating,
    createApiKey,
    revokeApiKey,
    deleteApiKey,
    refresh: fetchApiKeys,
  };
}
