import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle, Circle, PlayCircle, GraduationCap } from 'lucide-react';
import { getPathBySlug } from '@/lib/training/academyContent';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const AcademyPath: React.FC = () => {
  const { pathSlug } = useParams<{ pathSlug: string }>();
  const navigate = useNavigate();
  const { getLessonProgress, getPathCompletionPercentage, getNextLesson, isLoading } = useTrainingProgress();

  const path = pathSlug ? getPathBySlug(pathSlug) : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Learning path not found</p>
          <Button onClick={() => navigate('/academy')}>
            Back to Academy
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage = getPathCompletionPercentage(path.slug, path.lessons.length);
  const nextLessonSlug = getNextLesson(path.slug, path.lessons.map(l => l.slug));
  const totalMinutes = path.lessons.reduce((acc, lesson) => acc + lesson.estimatedMinutes, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/academy')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academy
        </Button>

        {/* Path Header */}
        <div className="mb-8">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white mb-4`}>
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-h1 mb-2">{path.title}</h1>
          <p className="text-body text-muted-foreground mb-4">
            {path.description}
          </p>

          {/* Path Stats */}
          <div className="flex items-center gap-6 text-body-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span>{path.lessons.length} lessons</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{totalMinutes} minutes total</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h4">Your Progress</h3>
              <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'} className="text-lg px-3">
                {completionPercentage}%
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-3 mb-4" />
            
            {nextLessonSlug && (
              <Button 
                onClick={() => navigate(`/academy/${path.slug}/${nextLessonSlug}`)}
                className="w-full sm:w-auto"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Continue Learning
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lessons List */}
        <div className="space-y-4">
          <h2 className="text-h3">Lessons</h2>
          
          {path.lessons.map((lesson, index) => {
            const lessonProgress = getLessonProgress(lesson.slug);
            const status = lessonProgress?.status || 'not_started';
            
            let icon = <Circle className="h-5 w-5 text-muted-foreground" />;
            let statusColor = 'text-muted-foreground';
            
            if (status === 'completed') {
              icon = <CheckCircle className="h-5 w-5 text-status-success" />;
              statusColor = 'text-status-success';
            } else if (status === 'in_progress') {
              icon = <PlayCircle className="h-5 w-5 text-primary" />;
              statusColor = 'text-primary';
            }

            return (
              <Link 
                key={lesson.slug}
                to={`/academy/${path.slug}/${lesson.slug}`}
              >
                <Card className="hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Lesson Number & Status */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        {icon}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-grow">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-h5 hover:text-primary transition-colors">
                            {lesson.title}
                          </h3>
                          <Badge variant="outline" className="flex-shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            {lesson.estimatedMinutes} min
                          </Badge>
                        </div>
                        <p className="text-body-sm text-muted-foreground mb-3">
                          {lesson.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="capitalize">
                            {lesson.contentType.replace('-', ' ')}
                          </Badge>
                          {status !== 'not_started' && (
                            <span className={`text-body-sm font-medium ${statusColor} capitalize`}>
                              {status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AcademyPath;