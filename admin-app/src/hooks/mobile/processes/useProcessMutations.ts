import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useProcessMutations = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();

  const createProcess = useMutation({
    mutationFn: async (data: { name: string; owner?: string; description?: string }) => {
      if (!currentCompany?.id || !user?.id) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('business_processes')
        .insert({
          company_id: currentCompany?.id,
          name: data.name,
          owner: data.owner || null,
          description: data.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Process created');
    },
    onError: () => {
      toast.error('Failed to create process');
    },
  });

  const deleteProcess = useMutation({
    mutationFn: async (processId: string) => {
      const { error } = await supabase
        .from('business_processes')
        .delete()
        .eq('id', processId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Process deleted');
    },
    onError: () => {
      toast.error('Failed to delete process');
    },
  });

  const deleteAllProcesses = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('No company selected');

      const { error } = await supabase
        .from('business_processes')
        .delete()
        .eq('company_id', currentCompany?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('All processes deleted');
    },
    onError: () => {
      toast.error('Failed to delete processes');
    },
  });

  const addMajorStep = useMutation({
    mutationFn: async (data: { processId: string; title: string }) => {
      // Get current max display_order
      const { data: existing } = await supabase
        .from('process_major_steps')
        .select('display_order')
        .eq('process_id', data.processId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      const { data: result, error } = await supabase
        .from('process_major_steps')
        .insert({
          process_id: data.processId,
          title: data.title,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-process', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to add step');
    },
  });

  const deleteMajorStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('process_major_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to delete step');
    },
  });

  const addMinorStep = useMutation({
    mutationFn: async (data: { majorStepId: string; title: string; hyperlink?: string }) => {
      // Get current max display_order
      const { data: existing } = await supabase
        .from('process_minor_steps')
        .select('display_order')
        .eq('major_step_id', data.majorStepId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      const { data: result, error } = await supabase
        .from('process_minor_steps')
        .insert({
          major_step_id: data.majorStepId,
          title: data.title,
          hyperlink: data.hyperlink || null,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to add sub-step');
    },
  });

  const deleteMinorStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('process_minor_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to delete sub-step');
    },
  });

  const updateMinorStep = useMutation({
    mutationFn: async (data: { id: string; title?: string; hyperlink?: string | null }) => {
      const updateData: { title?: string; hyperlink?: string | null } = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.hyperlink !== undefined) updateData.hyperlink = data.hyperlink;

      const { error } = await supabase
        .from('process_minor_steps')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to update sub-step');
    },
  });

  const reorderMajorSteps = useMutation({
    mutationFn: async (data: { processId: string; activeId: string; overId: string }) => {
      // Get all major steps for this process
      const { data: steps, error: fetchError } = await supabase
        .from('process_major_steps')
        .select('id, display_order')
        .eq('process_id', data.processId)
        .order('display_order');

      if (fetchError) throw fetchError;
      if (!steps) return;

      // Find indices
      const activeIndex = steps.findIndex(s => s.id === data.activeId);
      const overIndex = steps.findIndex(s => s.id === data.overId);

      if (activeIndex === -1 || overIndex === -1) return;

      // Reorder array
      const [removed] = steps.splice(activeIndex, 1);
      steps.splice(overIndex, 0, removed);

      // Update display_order for all items
      const updates = steps.map((step, index) => ({
        id: step.id,
        display_order: index,
      }));

      await Promise.all(updates.map(update =>
        supabase
          .from('process_major_steps')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
    },
    onError: () => {
      toast.error('Failed to reorder steps');
    },
  });

  const reorderMinorSteps = useMutation({
    mutationFn: async (data: { majorStepId: string; activeId: string; overId: string }) => {
      // Get all minor steps for this major step
      const { data: steps, error: fetchError } = await supabase
        .from('process_minor_steps')
        .select('id, display_order')
        .eq('major_step_id', data.majorStepId)
        .order('display_order');

      if (fetchError) throw fetchError;
      if (!steps) return;

      // Find indices
      const activeIndex = steps.findIndex(s => s.id === data.activeId);
      const overIndex = steps.findIndex(s => s.id === data.overId);

      if (activeIndex === -1 || overIndex === -1) return;

      // Reorder array
      const [removed] = steps.splice(activeIndex, 1);
      steps.splice(overIndex, 0, removed);

      // Update display_order for all items
      const updates = steps.map((step, index) => ({
        id: step.id,
        display_order: index,
      }));

      await Promise.all(updates.map(update =>
        supabase
          .from('process_minor_steps')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process'] });
    },
    onError: () => {
      toast.error('Failed to reorder sub-steps');
    },
  });

  const bulkCreateProcesses = useMutation({
    mutationFn: async (processes: Array<{
      name: string;
      owner?: string;
      description?: string;
      steps: Array<{
        title: string;
        minorSteps: Array<{ title: string; hyperlink?: string }>;
      }>;
    }>) => {
      if (!currentCompany?.id || !user?.id) throw new Error('Not authenticated');

      for (const process of processes) {
        // Create process
        const { data: createdProcess, error: processError } = await supabase
          .from('business_processes')
          .insert({
            company_id: currentCompany?.id,
            name: process.name,
            owner: process.owner || null,
            description: process.description || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (processError) throw processError;

        // Create major steps
        for (let i = 0; i < process.steps.length; i++) {
          const step = process.steps[i];
          const { data: createdStep, error: stepError } = await supabase
            .from('process_major_steps')
            .insert({
              process_id: createdProcess.id,
              title: step.title,
              display_order: i,
            })
            .select()
            .single();

          if (stepError) throw stepError;

          // Create minor steps
          if (step.minorSteps && step.minorSteps.length > 0) {
            const minorStepsToInsert = step.minorSteps.map((ms, j) => ({
              major_step_id: createdStep.id,
              title: ms.title,
              hyperlink: ms.hyperlink || null,
              display_order: j,
            }));

            const { error: minorError } = await supabase
              .from('process_minor_steps')
              .insert(minorStepsToInsert);

            if (minorError) throw minorError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to create processes');
    },
  });

  const reorderProcesses = useMutation({
    mutationFn: async (data: { activeId: string; overId: string }) => {
      if (!currentCompany?.id) throw new Error('No company selected');

      // Get all processes for this company
      const { data: processes, error: fetchError } = await supabase
        .from('business_processes')
        .select('id, display_order')
        .eq('company_id', currentCompany?.id)
        .order('display_order');

      if (fetchError) throw fetchError;
      if (!processes) return;

      // Find indices
      const activeIndex = processes.findIndex(p => p.id === data.activeId);
      const overIndex = processes.findIndex(p => p.id === data.overId);

      if (activeIndex === -1 || overIndex === -1) return;

      // Reorder array
      const [removed] = processes.splice(activeIndex, 1);
      processes.splice(overIndex, 0, removed);

      // Update display_order for all items
      const updates = processes.map((process, index) => ({
        id: process.id,
        display_order: index,
      }));

      await Promise.all(updates.map(update =>
        supabase
          .from('business_processes')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: () => {
      toast.error('Failed to reorder processes');
    },
  });

  return {
    createProcess,
    deleteProcess,
    deleteAllProcesses,
    addMajorStep,
    deleteMajorStep,
    addMinorStep,
    deleteMinorStep,
    updateMinorStep,
    reorderMajorSteps,
    reorderMinorSteps,
    reorderProcesses,
    bulkCreateProcesses,
  };
};
