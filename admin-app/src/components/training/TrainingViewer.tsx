import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, BookOpen, ArrowLeft } from 'lucide-react';
import { useAssignments } from '@/hooks/useAssignments';
import { usePlaybooks } from '@/hooks/usePlaybooks';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toastService } from '@/services/toastService';
import { logger } from '@/utils/logger';

type ProgressStatus = "in_progress" | "completed" | "not_started" | "failed";

export const TrainingViewer: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { playbooks } = usePlaybooks();
  
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Find the assignment and playbook
  const assignment = assignments.find(a => a.assignment_id === assignmentId);
  const playbook = assignment ? playbooks.find(p => p.id === assignment.playbook_id) : null;

  // Get current content
  const currentModule = playbook?.modules?.[currentModuleIndex];
  const currentLesson = currentModule?.lessons?.[currentLessonIndex];
  const currentBlock = currentLesson?.blocks?.[currentBlockIndex];
  const totalBlocks = currentLesson?.blocks?.length || 0;

  useEffect(() => {
    if (assignment && profile?.id) {
      fetchLessonProgress();
    }
  }, [assignment, profile?.id]);

  const fetchLessonProgress = async () => {
    if (!profile?.id || !assignment) return;

    try {
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', profile.id);

      if (error) throw error;

      const progressMap = {};
      data?.forEach(progress => {
        progressMap[progress.lesson_id] = progress;
      });
      setLessonProgress(progressMap);
    } catch (error) {
      logger.error('Error fetching lesson progress:', error);
    }
  };

  const updateLessonProgress = async (lessonId: string, status: ProgressStatus, completed = false) => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const progressData = {
        user_id: profile.id,
        lesson_id: lessonId,
        assignment_id: assignmentId,
        status,
        ...(completed && { completed_at: new Date().toISOString() }),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert(progressData, { onConflict: 'user_id,lesson_id' });

      if (error) throw error;

      await fetchLessonProgress();
      
      // Success toast removed as per plan
    } catch (error) {
      logger.error('Error updating lesson progress:', error);
      toastService.error('Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < totalBlocks - 1) {
      setCurrentBlockIndex(currentBlockIndex + 1);
    } else {
      // End of lesson, mark as completed
      if (currentLesson) {
        updateLessonProgress(currentLesson.id, 'completed', true);
      }
      handleNextLesson();
    }
  };

  const handlePreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
    } else {
      handlePreviousLesson();
    }
  };

  const handleNextLesson = () => {
    const nextLessonIndex = currentLessonIndex + 1;
    if (nextLessonIndex < (currentModule?.lessons?.length || 0)) {
      setCurrentLessonIndex(nextLessonIndex);
      setCurrentBlockIndex(0);
    } else {
      // End of module, go to next module
      const nextModuleIndex = currentModuleIndex + 1;
      if (nextModuleIndex < (playbook?.modules?.length || 0)) {
        setCurrentModuleIndex(nextModuleIndex);
        setCurrentLessonIndex(0);
        setCurrentBlockIndex(0);
      } else {
        // End of playbook - success toast removed as per plan
        navigate('/my-learning');
      }
    }
  };

  const handlePreviousLesson = () => {
    const prevLessonIndex = currentLessonIndex - 1;
    if (prevLessonIndex >= 0) {
      setCurrentLessonIndex(prevLessonIndex);
      const prevLesson = currentModule?.lessons?.[prevLessonIndex];
      setCurrentBlockIndex((prevLesson?.blocks?.length || 1) - 1);
    } else {
      // Go to previous module
      const prevModuleIndex = currentModuleIndex - 1;
      if (prevModuleIndex >= 0) {
        setCurrentModuleIndex(prevModuleIndex);
        const prevModule = playbook?.modules?.[prevModuleIndex];
        const lastLessonIndex = (prevModule?.lessons?.length || 1) - 1;
        setCurrentLessonIndex(lastLessonIndex);
        const lastLesson = prevModule?.lessons?.[lastLessonIndex];
        setCurrentBlockIndex((lastLesson?.blocks?.length || 1) - 1);
      }
    }
  };

  const calculateOverallProgress = () => {
    if (!playbook?.modules) return 0;
    
    let totalLessons = 0;
    let completedLessons = 0;
    
    playbook.modules.forEach(module => {
      module.lessons?.forEach(lesson => {
        totalLessons++;
        const progress = lessonProgress[lesson.id];
        if (progress?.status === 'completed') {
          completedLessons++;
        }
      });
    });
    
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  const renderBlockContent = (block: any) => {
    if (!block) return <div>No content available</div>;

    switch (block.block_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed">{block.content.text}</p>
          </div>
        );
      case 'video':
        return (
          <div className="aspect-video">
            <iframe
              src={block.content.url}
              className="w-full h-full rounded-lg"
              allowFullScreen
              title="Training Video"
            />
          </div>
        );
      case 'image':
        return (
          <div className="text-center">
            <img
              src={block.content.url}
              alt={block.content.alt || 'Training Image'}
              className="max-w-full h-auto rounded-lg mx-auto"
            />
            {block.content.caption && (
              <p className="text-sm text-muted-foreground mt-2">{block.content.caption}</p>
            )}
          </div>
        );
      case 'quiz':
        return (
          <div className="bg-accent/50 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">{block.content.question}</h4>
            <div className="space-y-2">
              {block.content.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  className="w-full text-left p-3 bg-card rounded border border-border hover:bg-accent transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return <div>Unsupported content type: {block.block_type}</div>;
    }
  };

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-2">Loading training...</span>
      </div>
    );
  }

  if (!assignment || !playbook) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Training not found</p>
              <Button onClick={() => navigate('/my-learning')}>
                Back to My Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-learning')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Learning
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{playbook.title}</h1>
              <p className="text-sm text-muted-foreground">
                Module {currentModuleIndex + 1}: {currentModule?.title}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Overall Progress</div>
            <div className="font-semibold">{calculateOverallProgress()}%</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card px-6 py-2 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <Progress value={calculateOverallProgress()} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Outline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {playbook.modules?.map((module, moduleIdx) => (
                    <div key={module.id}>
                      <div
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          moduleIdx === currentModuleIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setCurrentModuleIndex(moduleIdx)}
                      >
                        <div className="font-medium text-sm">{module.title}</div>
                      </div>
                      {moduleIdx === currentModuleIndex && (
                        <div className="ml-4 mt-1 space-y-1">
                          {module.lessons?.map((lesson, lessonIdx) => {
                            const progress = lessonProgress[lesson.id];
                            const isCompleted = progress?.status === 'completed';
                            const isCurrent = lessonIdx === currentLessonIndex;
                            
                            return (
                              <div
                                key={lesson.id}
                                className={`p-1 rounded text-xs flex items-center space-x-2 cursor-pointer ${
                                  isCurrent ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setCurrentLessonIndex(lessonIdx)}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-3 w-3 text-primary" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                <span>{lesson.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>{currentLesson?.title}</span>
                    </CardTitle>
                    {currentLesson?.description && (
                      <p className="text-muted-foreground mt-1">{currentLesson.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {currentBlockIndex + 1} of {totalBlocks}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  {renderBlockContent(currentBlock)}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousBlock}
                    disabled={currentModuleIndex === 0 && currentLessonIndex === 0 && currentBlockIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentLesson?.estimated_duration_minutes && (
                      <span>Est. {currentLesson.estimated_duration_minutes} min</span>
                    )}
                  </div>

                  <Button
                    onClick={handleNextBlock}
                    disabled={loading}
                  >
                    {loading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        {currentBlockIndex === totalBlocks - 1 &&
                        currentLessonIndex === (currentModule?.lessons?.length || 0) - 1 &&
                        currentModuleIndex === (playbook?.modules?.length || 0) - 1
                          ? 'Complete Training'
                          : 'Next'}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
