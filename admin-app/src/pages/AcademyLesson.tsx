import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { getLessonBySlug, getPathBySlug } from '@/lib/training/academyContent';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArticleRenderer } from '@/components/academy/ArticleRenderer';
import { StepGuide } from '@/components/academy/StepGuide';
import { Checklist } from '@/components/academy/Checklist';
import { Quiz } from '@/components/academy/Quiz';

const AcademyLesson: React.FC = () => {
  const { pathSlug, lessonSlug } = useParams<{ pathSlug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const { 
    getLessonProgress, 
    startLesson, 
    completeLesson, 
    isCompletingLesson,
    isLoading 
  } = useTrainingProgress();

  const lesson = lessonSlug ? getLessonBySlug(lessonSlug) : undefined;
  const path = pathSlug ? getPathBySlug(pathSlug) : undefined;

  // Mark lesson as in progress when opened
  useEffect(() => {
    if (lesson && !isLoading) {
      const progress = getLessonProgress(lesson.slug);
      if (!progress || progress.status === 'not_started') {
        startLesson({ lessonSlug: lesson.slug, pathSlug: lesson.pathSlug });
      }
    }
  }, [lesson, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!lesson || !path) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Lesson not found</p>
          <Button onClick={() => navigate('/academy')}>
            Back to Academy
          </Button>
        </div>
      </div>
    );
  }

  const lessonProgress = getLessonProgress(lesson.slug);
  const isCompleted = lessonProgress?.status === 'completed';

  // Find next lesson
  const currentIndex = path.lessons.findIndex(l => l.slug === lesson.slug);
  const nextLesson = currentIndex < path.lessons.length - 1 ? path.lessons[currentIndex + 1] : null;

  const handleComplete = () => {
    completeLesson({ 
      lessonSlug: lesson.slug, 
      pathSlug: lesson.pathSlug 
    });
  };

  const handleNext = () => {
    if (nextLesson) {
      navigate(`/academy/${pathSlug}/${nextLesson.slug}`);
    } else {
      navigate(`/academy/${pathSlug}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/academy/${pathSlug}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {path.title}
        </Button>

        {/* Lesson Content */}
        <Card className="mb-6">
          <CardContent className="pt-8">
            <div className="mb-8">
              <h1 className="text-h1 mb-2">{lesson.title}</h1>
              <p className="text-body text-muted-foreground">
                {lesson.description}
              </p>
              <div className="flex items-center gap-2 mt-4 text-body-sm text-muted-foreground">
                <span className="capitalize">{lesson.contentType.replace('-', ' ')}</span>
                <span>•</span>
                <span>{lesson.estimatedMinutes} minutes</span>
              </div>
            </div>

            {/* Render content based on type */}
            <div className="prose prose-slate max-w-none">
              {lesson.contentType === 'article' && (
                <ArticleRenderer content={lesson.content as string} />
              )}
              {lesson.contentType === 'step-guide' && (
                <StepGuide steps={lesson.content as any[]} />
              )}
              {lesson.contentType === 'checklist' && (
                <Checklist items={lesson.content as any[]} lessonSlug={lesson.slug} />
              )}
              {lesson.contentType === 'quiz' && (
                <Quiz 
                  questions={lesson.content as any[]} 
                  lessonSlug={lesson.slug}
                  pathSlug={lesson.pathSlug}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between gap-4">
          <Button 
            variant="outline"
            onClick={() => navigate(`/academy/${pathSlug}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Lessons
          </Button>

          <div className="flex items-center gap-3">
            {!isCompleted && lesson.contentType !== 'quiz' && (
              <Button 
                onClick={handleComplete}
                disabled={isCompletingLesson}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}

            {nextLesson && (
              <Button onClick={handleNext}>
                Next Lesson
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {!nextLesson && (
              <Button onClick={() => navigate(`/academy/${pathSlug}`)}>
                Back to Path
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademyLesson;