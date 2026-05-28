import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useUnarchiveRecent = () => {
  const unarchiveRecentItems = useCallback(async (limit: number = 10) => {
    try {
      // Get the last archived items across both task tables
      const { data: recentItems, error: fetchError } = await supabase.rpc('custom_sql', {
        query: `
          SELECT 
            'fast_tasks' as table_name,
            id,
            title,
            archived_at
          FROM fast_tasks 
          WHERE is_archived = true 
            AND user_id = auth.uid()
            AND archived_at IS NOT NULL
          UNION ALL
          SELECT 
            'kanban_tasks' as table_name,
            id,
            title,
            archived_at
          FROM kanban_tasks 
          WHERE is_archived = true 
            AND user_id = auth.uid()
            AND archived_at IS NOT NULL
          ORDER BY archived_at DESC 
          LIMIT ${limit}
        `
      });

      if (fetchError) {
        logger.error('Error fetching recent archived items:', fetchError);
        toast.error('Failed to fetch archived items');
        return;
      }

      if (!recentItems || recentItems.length === 0) {
        toast.info('No recently archived items found');
        return;
      }

      let unarchived = 0;
      const errors: string[] = [];

      // Unarchive each item
      for (const item of recentItems) {
        const itemData = item.result;
        try {
          const { error } = await supabase
            .from(itemData.table_name)
            .update({ 
              is_archived: false,
              archived_at: null
            })
            .eq('id', itemData.id);

          if (error) throw error;
          unarchived++;
          logger.log(`Unarchived ${itemData.table_name}: ${itemData.title}`);
        } catch (error) {
          logger.error(`Failed to unarchive ${itemData.title}:`, error);
          errors.push(itemData.title);
        }
      }

      // Show results
      if (unarchived > 0) {
        toast.success(`Successfully unarchived ${unarchived} item${unarchived === 1 ? '' : 's'}`);
      }
      
      if (errors.length > 0) {
        toast.error(`Failed to unarchive ${errors.length} item${errors.length === 1 ? '' : 's'}: ${errors.join(', ')}`);
      }

      return { unarchived, errors };

    } catch (error) {
      logger.error('Error in unarchiveRecentItems:', error);
      toast.error('Failed to unarchive items');
    }
  }, []);

  return { unarchiveRecentItems };
};