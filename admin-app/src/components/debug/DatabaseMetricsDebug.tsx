
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface DatabaseMetricsDebugProps {
  selectedTeam: string;
}

export const DatabaseMetricsDebug: React.FC<DatabaseMetricsDebugProps> = ({ selectedTeam }) => {
  const [dbMetrics, setDbMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDirectFromDb = async () => {
      if (!selectedTeam) return;
      
      setLoading(true);
      setError(null);
      
      try {
        logger.log('🔍 DatabaseMetricsDebug - Fetching directly from DB for team:', selectedTeam);
        
        const { data, error } = await supabase
          .from('weekly_metrics')
          .select(`
            id,
            metric_name,
            owner_id,
            team_id,
            user_id,
            created_at,
            updated_at,
            deleted_at
          `)
          .eq('team_id', selectedTeam)
          .order('created_at', { ascending: false });

        if (error) {
          logger.error('🔍 DatabaseMetricsDebug - Database error:', error);
          setError(error.message);
          return;
        }

        logger.log('🔍 DatabaseMetricsDebug - Raw database results:', data);
        
        const analysisResults = {
          total: data?.length || 0,
          deleted: data?.filter(m => m.deleted_at !== null).length || 0,
          active: data?.filter(m => m.deleted_at === null).length || 0,
          withTestIds: data?.filter(m => m.id?.startsWith('test-')).length || 0,
          sampleRecords: data?.slice(0, 10) || []
        };

        logger.log('🔍 DatabaseMetricsDebug - Analysis:', analysisResults);
        setDbMetrics(data || []);
        
      } catch (err) {
        logger.error('🔍 DatabaseMetricsDebug - Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDirectFromDb();
  }, [selectedTeam]);

  if (!selectedTeam) {
    return (
      <div className="p-4 bg-muted/50 border rounded-lg">
        <div className="text-sm text-secondary-foreground">No team selected for database debug</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-primary/5 border-2 border-blue-200 rounded-lg mb-4">
      <h3 className="font-bold text-blue-800 mb-2">🔍 Database Direct Query Debug</h3>
      <div className="text-xs space-y-2">
        <div><strong>Team:</strong> {selectedTeam}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        {error && <div className="text-destructive"><strong>Error:</strong> {error}</div>}
        
        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div className="bg-white p-2 rounded">
                <div className="font-semibold">Total Records</div>
                <div className="text-lg">{dbMetrics.length}</div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-semibold">Active</div>
                <div className="text-lg text-success">
                  {dbMetrics.filter(m => m.deleted_at === null).length}
                </div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-semibold">Deleted</div>
                <div className="text-lg text-destructive">
                  {dbMetrics.filter(m => m.deleted_at !== null).length}
                </div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-semibold">Test IDs</div>
                <div className="text-lg text-warning">
                  {dbMetrics.filter(m => m.id?.startsWith('test-')).length}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="font-semibold mb-2">Sample Records (First 5):</div>
              <div className="bg-white p-2 rounded max-h-40 overflow-y-auto">
                {dbMetrics.slice(0, 5).map((metric, idx) => (
                  <div key={idx} className={`text-xs p-1 border-b ${metric.id?.startsWith('test-') ? 'bg-destructive/5' : 'bg-success/5'}`}>
                    <div><strong>ID:</strong> {metric.id} {metric.id?.startsWith('test-') && '← TEST ID!'}</div>
                    <div><strong>Name:</strong> {metric.metric_name}</div>
                    <div><strong>Owner:</strong> {metric.owner_id}</div>
                    <div><strong>Status:</strong> {metric.deleted_at ? 'DELETED' : 'ACTIVE'}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
