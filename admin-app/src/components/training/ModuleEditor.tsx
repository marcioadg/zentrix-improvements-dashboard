import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { LessonEditor } from './LessonEditor';
import { ModuleSettingsDropdown } from "./ModuleSettingsDropdown";

interface ModuleEditorProps {
  module: any;
  onUpdate: (module: any) => void;
  onDelete: () => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({
  module,
  onUpdate,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleModuleChange = (field: string, value: any) => {
    onUpdate({ ...module, [field]: value });
  };

  const addLesson = () => {
    const newLesson = {
      id: `lesson-${Date.now()}`,
      title: 'New Lesson',
      description: '',
      lesson_type: 'content',
      is_required: true,
      order_position: module.lessons?.length || 0,
      estimated_duration_minutes: 10,
      department_tags: [],
      role_tags: [],
      topic_tags: [],
      blocks: []
    };
    
    const updatedLessons = [...(module.lessons || []), newLesson];
    handleModuleChange('lessons', updatedLessons);
  };

  const updateLesson = (lessonIndex: number, updatedLesson: any) => {
    const updatedLessons = [...(module.lessons || [])];
    updatedLessons[lessonIndex] = updatedLesson;
    handleModuleChange('lessons', updatedLessons);
  };

  const deleteLesson = (lessonIndex: number) => {
    const updatedLessons = (module.lessons || []).filter((_, index) => index !== lessonIndex);
    handleModuleChange('lessons', updatedLessons);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <Input
              value={module.title}
              onChange={(e) => handleModuleChange('title', e.target.value)}
              className="font-semibold border-none p-0 h-auto"
              placeholder="Module title..."
            />
          </div>
          <Badge variant={module.is_required ? "default" : "secondary"}>
            {module.is_required ? "Required" : "Optional"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleModuleChange('is_required', !module.is_required)}
          >
            Toggle Required
          </Button>
          <ModuleSettingsDropdown onDelete={onDelete} />
        </div>
        
        {isExpanded && (
          <Textarea
            value={module.description}
            onChange={(e) => handleModuleChange('description', e.target.value)}
            placeholder="Module description..."
            className="mt-2"
            rows={2}
          />
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Lessons</h4>
              <Button size="sm" onClick={addLesson}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>

            <div className="space-y-4">
              {(module.lessons || []).map((lesson, index) => (
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  onUpdate={(updatedLesson) => updateLesson(index, updatedLesson)}
                  onDelete={() => deleteLesson(index)}
                />
              ))}
              
              {(!module.lessons || module.lessons.length === 0) && (
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <p className="text-muted-foreground mb-4">No lessons in this module</p>
                  <Button variant="outline" onClick={addLesson}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Lesson
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
