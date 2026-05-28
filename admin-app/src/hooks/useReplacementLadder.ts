import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyScoped } from '@/hooks/useCompanyScoped';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface Task {
  id: string;
  name: string;
  isDelegated: boolean;
  owner?: string;
  notes?: string;
  sopLink?: string;
}

export interface Level {
  id: number;
  title: string;
  hourlyRate: string;
  tasks: Task[];
  isNonDelegable?: boolean;
}

const DEFAULT_LEVELS: Level[] = [
  {
    id: 1,
    title: 'Level 1',
    hourlyRate: '$10/hour',
    tasks: [
      { id: '1-1', name: 'Inbox', isDelegated: false },
      { id: '1-2', name: 'Calendar', isDelegated: false },
      { id: '1-3', name: 'Admin', isDelegated: false },
      { id: '1-4', name: 'Bookkeeping', isDelegated: false },
      { id: '1-5', name: 'Grocery Shopping', isDelegated: false },
      { id: '1-6', name: 'Meal Planning', isDelegated: false },
      { id: '1-7', name: 'Bill Paying', isDelegated: false },
      { id: '1-8', name: 'Personal Finances', isDelegated: false },
      { id: '1-9', name: 'Online Form Filling', isDelegated: false },
      { id: '1-10', name: 'House Maintenance', isDelegated: false },
    ]
  },
  {
    id: 2,
    title: 'Level 2',
    hourlyRate: '$25/hour',
    tasks: [
      { id: '2-1', name: 'Customer Onboarding', isDelegated: false },
      { id: '2-2', name: 'Support', isDelegated: false },
      { id: '2-3', name: 'Delivering Services', isDelegated: false },
      { id: '2-4', name: 'Payroll', isDelegated: false },
    ]
  },
  {
    id: 3,
    title: 'Level 3',
    hourlyRate: '$100/hour',
    tasks: [
      { id: '3-1', name: 'Marketing', isDelegated: false },
      { id: '3-2', name: 'Sales', isDelegated: false },
      { id: '3-3', name: 'Hiring & Performance', isDelegated: false },
      { id: '3-4', name: 'Financial Reporting', isDelegated: false },
    ]
  },
  {
    id: 4,
    title: 'Level 4',
    hourlyRate: '$500/hour',
    tasks: [
      { id: '4-1', name: 'Leadership Development', isDelegated: false },
      { id: '4-2', name: 'Playbook Design', isDelegated: false },
      { id: '4-3', name: 'Planning With Team', isDelegated: false },
      { id: '4-4', name: 'Financial Approvals', isDelegated: false },
    ]
  },
  {
    id: 5,
    title: 'Level 5',
    hourlyRate: '$1,000/hour',
    tasks: [
      { id: '5-1', name: 'Vision', isDelegated: false },
      { id: '5-2', name: 'Strategy', isDelegated: false },
      { id: '5-3', name: 'Innovation', isDelegated: false },
    ]
  },
  {
    id: 6,
    title: 'Level 6',
    hourlyRate: '$10,000/hour (Passive Owner)',
    tasks: [
      { id: '6-1', name: 'Participate in Quarterly Board Meetings', isDelegated: false },
    ],
    isNonDelegable: true
  }
];

export const useReplacementLadder = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompanyScoped();
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>(DEFAULT_LEVELS);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable references for dependencies
  const stableCompanyId = useMemo(() => currentCompany?.id, [currentCompany?.id]);
  const stableUserId = useMemo(() => user?.id, [user?.id]);

  // Single effect to handle all data loading logic
  useEffect(() => {
    logger.log('📊 useReplacementLadder: Effect triggered', { 
      hasUser: !!stableUserId,
      hasCompany: !!stableCompanyId,
      userId: stableUserId,
      companyId: stableCompanyId
    });

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset to defaults immediately when company changes or no data
    setLevels(DEFAULT_LEVELS);

    if (!stableUserId || !stableCompanyId) {
      logger.log('📊 useReplacementLadder: No user or company, stopping');
      setLoading(false);
      return;
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadReplacementLadderData = async () => {
      logger.log('📊 useReplacementLadder: Starting data fetch', { 
        userId: stableUserId, 
        companyId: stableCompanyId 
      });
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('replacement_ladder_data')
          .select('*')
          .eq('user_id', stableUserId)
          .eq('company_id', stableCompanyId)
          .abortSignal(controller.signal);

        // Check if request was aborted
        if (controller.signal.aborted) {
          logger.log('📊 useReplacementLadder: Request aborted');
          return;
        }

        if (error) {
          logger.error('Error loading replacement ladder data:', error);
          toast({
            title: "Error",
            description: "Failed to load your replacement ladder data",
            variant: "destructive",
          });
          return;
        }

        if (data && data.length > 0) {
          logger.log('📊 useReplacementLadder: Data received, merging with defaults', { 
            recordCount: data.length 
          });
          
          // Merge saved data with default structure
          const mergedLevels = DEFAULT_LEVELS.map(level => ({
            ...level,
            tasks: level.tasks.map(task => {
              const savedTask = data.find(
                d => d.level_id === level.id && d.task_id === task.id
              );
              
              if (savedTask) {
                return {
                  ...task,
                  isDelegated: savedTask.is_delegated,
                  owner: savedTask.owner,
                  notes: savedTask.notes,
                  sopLink: savedTask.sop_link,
                };
              }
              
              return task;
            })
          }));
          
          setLevels(mergedLevels);
        } else {
          logger.log('📊 useReplacementLadder: No data found, keeping defaults');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.log('📊 useReplacementLadder: Request was cancelled');
          return;
        }
        logger.error('Error loading replacement ladder data:', error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadReplacementLadderData();

    // Cleanup function
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [stableUserId, stableCompanyId]); // Removed toast from dependencies

  // Save task to database
  const saveTaskToDatabase = async (levelId: number, task: Task) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('replacement_ladder_data')
        .upsert({
          user_id: user.id,
          company_id: currentCompany?.id || null,
          level_id: levelId,
          task_id: task.id,
          task_name: task.name,
          is_delegated: task.isDelegated,
          owner: task.owner,
          notes: task.notes,
          sop_link: task.sopLink,
        }, {
          onConflict: 'user_id,level_id,task_id'
        });

      if (error) {
        logger.error('Error saving task:', error);
        toast({
          title: "Error",
          description: "Failed to save task changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error saving task:', error);
    }
  };

  const toggleTaskDelegation = async (levelId: number, taskId: string) => {
    const updatedLevels = levels.map(level => 
      level.id === levelId 
        ? {
            ...level,
            tasks: level.tasks.map(task =>
              task.id === taskId 
                ? { ...task, isDelegated: !task.isDelegated }
                : task
            )
          }
        : level
    );
    
    setLevels(updatedLevels);

    // Save to database
    const level = updatedLevels.find(l => l.id === levelId);
    const task = level?.tasks.find(t => t.id === taskId);
    if (task) {
      await saveTaskToDatabase(levelId, task);
    }
  };

  const updateTaskDetails = async (levelId: number, taskId: string, updates: Partial<Task>) => {
    const updatedLevels = levels.map(level => 
      level.id === levelId 
        ? {
            ...level,
            tasks: level.tasks.map(task =>
              task.id === taskId 
                ? { ...task, ...updates }
                : task
            )
          }
        : level
    );
    
    setLevels(updatedLevels);

    // Save to database
    const level = updatedLevels.find(l => l.id === levelId);
    const task = level?.tasks.find(t => t.id === taskId);
    if (task) {
      await saveTaskToDatabase(levelId, task);
    }
  };

  const getTotalDelegated = () => {
    const delegableTasksCount = levels
      .filter(level => !level.isNonDelegable)
      .reduce((total, level) => total + level.tasks.length, 0);
    
    const delegatedCount = levels
      .filter(level => !level.isNonDelegable)
      .reduce((total, level) => 
        total + level.tasks.filter(task => task.isDelegated).length, 0
      );

    return { delegated: delegatedCount, total: delegableTasksCount };
  };

  const generateDelegationRoadmap = () => {
    const notDelegatedTasks = levels
      .filter(level => !level.isNonDelegable)
      .flatMap(level => 
        level.tasks
          .filter(task => !task.isDelegated)
          .map(task => ({
            level: level.title,
            hourlyRate: level.hourlyRate,
            task: task.name
          }))
      );

    if (notDelegatedTasks.length === 0) {
      toast({
        title: "Congratulations!",
        description: "All delegable tasks have been delegated!",
      });
      return;
    }

    const roadmapText = notDelegatedTasks
      .map(item => `${item.level} (${item.hourlyRate}): ${item.task}`)
      .join('\n');

    navigator.clipboard.writeText(roadmapText);
    toast({
      title: "Delegation Roadmap Generated",
      description: `${notDelegatedTasks.length} tasks copied to clipboard`,
    });
  };

  return {
    levels,
    loading,
    toggleTaskDelegation,
    updateTaskDetails,
    getTotalDelegated,
    generateDelegationRoadmap,
  };
};