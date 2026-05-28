import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toastService } from '@/services/toastService';
import { logger } from '@/utils/logger';

export const usePlaybooks = () => {
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompanyAccess();
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentCompany?.id) {
      logger.log('Profile loaded, fetching playbooks for company:', currentCompany?.id);
      fetchPlaybooks();
    } else if (currentCompany !== undefined) {
      logger.warn('No current company selected');
      setError('No company selected');
      setLoading(false);
    }
  }, [currentCompany?.id]);

  // Optimized fetch: single query with nested relationships for playbooks → modules → lessons → lesson_blocks
  const fetchPlaybooks = async () => {
    if (!currentCompany?.id) {
      logger.warn('Cannot fetch playbooks: no current company selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.log('Fetching nested playbooks for company:', currentCompany?.id);

      // One query: nested select (playbooks → modules → lessons → blocks), NOTE: columns must be explicitly listed
      const { data: playbooksData, error: playbooksError } = await supabase
        .from('playbooks')
        .select(`
          *,
          modules:modules (
            *,
            lessons:lessons (
              *,
              lesson_blocks:lesson_blocks ( * )
            )
          )
        `)
        .eq('company_id', currentCompany?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (playbooksError) {
        logger.error('Error fetching playbooks:', playbooksError);
        throw playbooksError;
      }

      if (!playbooksData || playbooksData.length === 0) {
        setPlaybooks([]);
        setError(null);
        setLoading(false);
        return;
      }

      // The result is already deeply nested: playbooks->modules->lessons->blocks
      setPlaybooks(playbooksData);
      setError(null);
    } catch (err) {
      logger.error('Error fetching playbooks:', err);
      setError(err.message);
      toastService.error("Failed to load playbooks");
    } finally {
      setLoading(false);
    }
  };

  const createPlaybook = async (playbookData: any) => {
    if (!currentCompany?.id) {
      const errorMsg = 'Cannot create playbook: no company selected';
      logger.error(errorMsg);
      toastService.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      logger.log('Creating playbook:', playbookData);
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        throw new Error('User not authenticated');
      }

      // Separate modules from playbook data
      const { modules, ...playbookInfo } = playbookData;

      const { data, error } = await supabase
        .from('playbooks')
        .insert({
          ...playbookInfo,
          company_id: currentCompany?.id,
          created_by: user.data.user.id
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating playbook:', error);
        throw error;
      }
      
      logger.log('Successfully created playbook:', data);

      // Create modules if provided
      if (modules && Array.isArray(modules) && modules.length > 0) {
        await createPlaybookModules(data.id, modules, user.data.user.id);
      }
      
      await fetchPlaybooks();
      
      // Success toast removed as per plan
      
      return data;
    } catch (err) {
      logger.error('Error creating playbook:', err);
      toastService.error(`Failed to create playbook: ${err.message}`);
      throw err;
    }
  };

  const createPlaybookModules = async (playbookId: string, modules: any[], userId: string) => {
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const { lessons, id, ...moduleData } = module; // Remove id and lessons from module data
      
      logger.log(`Creating module ${i + 1}/${modules.length}:`, moduleData.title);
      
      const { data: moduleResult, error: moduleError } = await supabase
        .from('modules')
        .insert({
          title: moduleData.title,
          description: moduleData.description,
          is_required: moduleData.is_required,
          playbook_id: playbookId,
          created_by: userId,
          order_position: i
        })
        .select()
        .single();
      
      if (moduleError) {
        logger.error('Error creating module:', moduleError);
        throw moduleError;
      }
      
      logger.log('Successfully created module:', moduleResult.id);
      
      // Handle lessons if they exist
      if (lessons && Array.isArray(lessons) && lessons.length > 0) {
        await createModuleLessons(moduleResult.id, lessons, userId);
      }
    }
  };

  const createModuleLessons = async (moduleId: string, lessons: any[], userId: string) => {
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const { blocks, id, ...lessonData } = lesson; // Remove id and blocks from lesson data
      
      logger.log(`Creating lesson ${i + 1}/${lessons.length}:`, lessonData.title);
      
      const { data: lessonResult, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          title: lessonData.title,
          description: lessonData.description,
          lesson_type: lessonData.lesson_type,
          is_required: lessonData.is_required,
          estimated_duration_minutes: lessonData.estimated_duration_minutes,
          department_tags: lessonData.department_tags,
          role_tags: lessonData.role_tags,
          topic_tags: lessonData.topic_tags,
          module_id: moduleId,
          created_by: userId,
          order_position: i
        })
        .select()
        .single();
      
      if (lessonError) {
        logger.error('Error creating lesson:', lessonError);
        throw lessonError;
      }
      
      logger.log('Successfully created lesson:', lessonResult.id);
      
      // Handle lesson blocks if they exist
      if (blocks && Array.isArray(blocks) && blocks.length > 0) {
        for (let j = 0; j < blocks.length; j++) {
          const block = blocks[j];
          const { id, ...blockData } = block; // Remove id from block data
          
          logger.log(`Creating block ${j + 1}/${blocks.length} for lesson:`, lessonResult.id);
          
          const { error: blockError } = await supabase
            .from('lesson_blocks')
            .insert({
              block_type: blockData.block_type,
              content: blockData.content,
              is_required: blockData.is_required,
              lesson_id: lessonResult.id,
              order_position: j
            });
          
          if (blockError) {
            logger.error('Error creating lesson block:', blockError);
            throw blockError;
          }
        }
      }
    }
  };

  const updatePlaybook = async (playbookId: string, updates: any) => {
    if (!currentCompany?.id) {
      const errorMsg = 'Cannot update playbook: no company selected';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      logger.log('Updating playbook:', playbookId, updates);
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        throw new Error('User not authenticated');
      }

      // Handle modules separately if they exist in updates
      const { modules, ...playbookUpdates } = updates;
      
      // Update the main playbook
      logger.log('Updating playbook data:', playbookUpdates);
      const { data, error } = await supabase
        .from('playbooks')
        .update({
          ...playbookUpdates,
          updated_at: new Date().toISOString(),
          updated_by: user.data.user.id
        })
        .eq('id', playbookId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating playbook:', error);
        throw error;
      }
      
      logger.log('Successfully updated playbook:', data);

      // Handle modules if provided
      if (modules && Array.isArray(modules)) {
        logger.log('Processing modules:', modules.length);
        await updatePlaybookModules(playbookId, modules, user.data.user.id);
      }
      
      await fetchPlaybooks();
      
      // Success toast removed as per plan
      
      return data;
    } catch (err) {
      logger.error('Error updating playbook:', err);
      toastService.error(`Failed to update playbook: ${err.message}`);
      throw err;
    }
  };

  const updatePlaybookModules = async (playbookId: string, modules: any[], userId: string) => {
    try {
      // Get existing modules
      const { data: existingModules, error: fetchError } = await supabase
        .from('modules')
        .select('id')
        .eq('playbook_id', playbookId);

      if (fetchError) {
        logger.error('Error fetching existing modules:', fetchError);
        throw fetchError;
      }

      // Delete existing modules and their children
      if (existingModules && existingModules.length > 0) {
        logger.log('Deleting existing modules:', existingModules.length);
        
        // Get lesson IDs for the modules we're about to delete
        const { data: existingLessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id')
          .in('module_id', existingModules.map(m => m.id));

        if (lessonsError) {
          logger.error('Error fetching existing lessons:', lessonsError);
          throw lessonsError;
        }

        // Delete lesson blocks first if there are lessons
        if (existingLessons && existingLessons.length > 0) {
          const { error: blocksError } = await supabase
            .from('lesson_blocks')
            .delete()
            .in('lesson_id', existingLessons.map(l => l.id));
          
          if (blocksError) {
            logger.error('Error deleting lesson blocks:', blocksError);
            throw blocksError;
          }
        }

        // Delete lessons
        const { error: lessonsDeleteError } = await supabase
          .from('lessons')
          .delete()
          .in('module_id', existingModules.map(m => m.id));

        if (lessonsDeleteError) {
          logger.error('Error deleting lessons:', lessonsDeleteError);
          throw lessonsDeleteError;
        }

        // Delete modules
        const { error: modulesError } = await supabase
          .from('modules')
          .delete()
          .eq('playbook_id', playbookId);

        if (modulesError) {
          logger.error('Error deleting modules:', modulesError);
          throw modulesError;
        }
      }
      
      // Insert new modules
      await createPlaybookModules(playbookId, modules, userId);
    } catch (err) {
      logger.error('Error updating playbook modules:', err);
      throw err;
    }
  };

  const deletePlaybook = async (playbookId: string) => {
    try {
      logger.log('Deleting playbook:', playbookId);
      const { error } = await supabase
        .from('playbooks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', playbookId);

      if (error) {
        logger.error('Error deleting playbook:', error);
        throw error;
      }
      
      logger.log('Successfully deleted playbook:', playbookId);
      await fetchPlaybooks();
      
      // Success toast removed as per plan
    } catch (err) {
      logger.error('Error deleting playbook:', err);
      toastService.error(`Failed to delete playbook: ${err.message}`);
      throw err;
    }
  };

  return {
    playbooks,
    loading,
    error,
    fetchPlaybooks,
    createPlaybook,
    updatePlaybook,
    deletePlaybook
  };
};
