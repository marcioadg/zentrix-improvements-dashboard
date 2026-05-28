import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface TrainingProgress {
  id: string;
  user_id: string;
  lesson_slug: string;
  path_slug: string;
  status: 'not_started' | 'in_progress' | 'completed';
  quiz_score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export function useTrainingProgress() {
  const queryClient = useQueryClient();

  // Fetch all training progress for current user
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['training-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_training_progress')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as TrainingProgress[];
    },
  });

  // Mark lesson as complete
  const completeLesson = useMutation({
    mutationFn: async ({ lessonSlug, pathSlug, quizScore }: { 
      lessonSlug: string; 
      pathSlug: string; 
      quizScore?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_training_progress')
        .upsert({
          user_id: user.id,
          lesson_slug: lessonSlug,
          path_slug: pathSlug,
          status: 'completed',
          quiz_score: quizScore,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_slug',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] });
      toast.success('Lesson completed!');
    },
    onError: (error) => {
      toast.error('Failed to mark lesson as complete');
      logger.error(error);
    },
  });

  // Mark lesson as in progress
  const startLesson = useMutation({
    mutationFn: async ({ lessonSlug, pathSlug }: { lessonSlug: string; pathSlug: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_training_progress')
        .upsert({
          user_id: user.id,
          lesson_slug: lessonSlug,
          path_slug: pathSlug,
          status: 'in_progress',
        }, {
          onConflict: 'user_id,lesson_slug',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] });
    },
  });

  // Helper: Get progress for specific lesson
  const getLessonProgress = (lessonSlug: string): TrainingProgress | undefined => {
    return progress.find(p => p.lesson_slug === lessonSlug);
  };

  // Helper: Calculate path completion percentage
  const getPathCompletionPercentage = (pathSlug: string, totalLessons: number): number => {
    const completedLessons = progress.filter(
      p => p.path_slug === pathSlug && p.status === 'completed'
    ).length;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  // Helper: Get next incomplete lesson in a path
  const getNextLesson = (pathSlug: string, orderedLessonSlugs: string[]): string | null => {
    for (const slug of orderedLessonSlugs) {
      const lessonProgress = getLessonProgress(slug);
      if (!lessonProgress || lessonProgress.status !== 'completed') {
        return slug;
      }
    }
    return null;
  };

  return {
    progress,
    isLoading,
    getLessonProgress,
    getPathCompletionPercentage,
    getNextLesson,
    completeLesson: completeLesson.mutate,
    startLesson: startLesson.mutate,
    isCompletingLesson: completeLesson.isPending,
  };
}