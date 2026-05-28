
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CheckCircle, Play } from 'lucide-react';

interface PlaybookPreviewProps {
  playbook: any;
  onClose: () => void;
}

export const PlaybookPreview: React.FC<PlaybookPreviewProps> = ({
  playbook,
  onClose
}) => {
  const totalDuration = playbook.modules?.reduce((total, module) => {
    return total + (module.lessons?.reduce((lessonTotal, lesson) => {
      return lessonTotal + (lesson.estimated_duration_minutes || 0);
    }, 0) || 0);
  }, 0) || 0;

  const totalLessons = playbook.modules?.reduce((total, module) => {
    return total + (module.lessons?.length || 0);
  }, 0) || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{playbook.title}</h1>
            <p className="text-muted-foreground mt-1">{playbook.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{totalDuration} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{playbook.modules?.length || 0} modules</span>
          </div>
        </div>

        {/* Tags */}
        {playbook.tags && playbook.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {playbook.tags.map((tag, index) => (
              <Badge key={index} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {playbook.modules?.map((module, moduleIndex) => (
            <Card key={moduleIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Module {moduleIndex + 1}: {module.title}
                  </CardTitle>
                  <Badge variant={module.is_required ? "default" : "secondary"}>
                    {module.is_required ? "Required" : "Optional"}
                  </Badge>
                </div>
                {module.description && (
                  <p className="text-muted-foreground">{module.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {module.lessons?.map((lesson, lessonIndex) => (
                    <div key={lessonIndex} className="border-l-2 border-muted pl-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Play className="h-3 w-3" />
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={lesson.is_required ? "default" : "outline"} className="text-xs">
                            {lesson.is_required ? "Required" : "Optional"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {lesson.estimated_duration_minutes || 0}min
                          </span>
                        </div>
                      </div>
                      
                      {lesson.description && (
                        <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lesson.department_tags?.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">Dept: {tag}</Badge>
                        ))}
                        {lesson.role_tags?.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">Role: {tag}</Badge>
                        ))}
                        {lesson.topic_tags?.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">Topic: {tag}</Badge>
                        ))}
                      </div>

                      {/* Content Blocks Preview */}
                      {lesson.blocks && lesson.blocks.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-muted-foreground">Content blocks:</div>
                          <div className="flex flex-wrap gap-2">
                            {lesson.blocks.map((block, blockIndex) => (
                              <Badge key={blockIndex} variant="outline" className="text-xs">
                                {block.block_type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!module.lessons || module.lessons.length === 0) && (
                    <p className="text-muted-foreground text-sm italic">No lessons in this module</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!playbook.modules || playbook.modules.length === 0) && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No modules created yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
