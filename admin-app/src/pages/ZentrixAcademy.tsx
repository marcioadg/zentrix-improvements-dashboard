import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { learningPaths } from '@/lib/training/academyContent';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const ZentrixAcademy: React.FC = () => {
  const { progress, isLoading, getPathCompletionPercentage, getNextLesson } = useTrainingProgress();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const totalLessons = learningPaths.reduce((acc, path) => acc + path.lessons.length, 0);
  const completedLessons = progress.filter(p => p.status === 'completed').length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Zentrix Academy</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Master Zentrix with structured, text-based training. Learn at your own pace and become an execution expert.
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-h4 mb-1">Your Progress</h3>
                <p className="text-body-sm text-muted-foreground">
                  {completedLessons} of {totalLessons} lessons completed
                </p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {overallProgress}%
              </Badge>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Learning Paths */}
        <div className="space-y-6">
          <h2 className="text-h2">Learning Paths</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {learningPaths.map((path) => {
              const completionPercentage = getPathCompletionPercentage(path.slug, path.lessons.length);
              const nextLesson = getNextLesson(path.slug, path.lessons.map(l => l.slug));
              const totalMinutes = path.lessons.reduce((acc, lesson) => acc + lesson.estimatedMinutes, 0);

              return (
                <Link 
                  key={path.slug} 
                  to={`/academy/${path.slug}`}
                  className="block group"
                >
                  <Card className="h-full hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      {/* Path Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${path.color} flex items-center justify-center text-white`}>
                          <GraduationCap className="h-6 w-6" />
                        </div>
                        {completionPercentage === 100 && (
                          <Badge variant="default" className="bg-accent-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>

                      {/* Path Info */}
                      <h3 className="text-h4 mb-2 group-hover:text-primary transition-colors">
                        {path.title}
                      </h3>
                      <p className="text-body-sm text-muted-foreground mb-4">
                        {path.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-body-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          <span>{path.lessons.length} lessons</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{totalMinutes} min</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-body-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{completionPercentage}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-2" />
                      </div>

                      {/* Continue Learning */}
                      {nextLesson && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between text-body-sm">
                            <span className="text-muted-foreground">Continue learning</span>
                            <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mt-12 bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="text-h4 mb-4">Getting Started</h3>
            <div className="space-y-3 text-body-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  1
                </div>
                <p>Choose a learning path above that matches your immediate needs</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  2
                </div>
                <p>Work through lessons in order - each builds on the previous one</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  3
                </div>
                <p>Apply what you learn immediately in your actual work</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ZentrixAcademy;