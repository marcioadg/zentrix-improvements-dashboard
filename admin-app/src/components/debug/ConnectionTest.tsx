
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export const ConnectionTest = () => {
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing connection...');

    try {
      // Test 1: Basic Supabase connection
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        setResult(`❌ Connection failed: ${error.message}`);
      } else {
        setResult('✅ Connection successful! Database is accessible.');
      }
    } catch (err: any) {
      setResult(`❌ Network error: ${err.message || err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={testing} className="w-full">
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        {result && (
          <div className={`p-3 rounded text-sm ${
            result.includes('✅') ? 'bg-success/5 text-success' : 'bg-destructive/5 text-red-700'
          }`}>
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
