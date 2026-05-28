import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Clock, Tag } from 'lucide-react';
import { ContentBlockEditor } from './ContentBlockEditor';
import { LessonSettingsDropdown } from "./LessonSettingsDropdown";

interface LessonEditorProps {
  lesson: any;
  onUpdate: (lesson: any) => void;
  onDelete: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  onUpdate,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagType, setTagType] = useState<'department' | 'role' | 'topic'>('topic');

  const handleLessonChange = (field: string, value: any) => {
    onUpdate({ ...lesson, [field]: value });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    
    const tagField = `${tagType}_tags`;
    const currentTags = lesson[tagField] || [];
    
    if (!currentTags.includes(newTag.trim())) {
      handleLessonChange(tagField, [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string, type: 'department' | 'role' | 'topic') => {
    const tagField = `${type}_tags`;
    const currentTags = lesson[tagField] || [];
    handleLessonChange(tagField, currentTags.filter(tag => tag !== tagToRemove));
  };

  const addContentBlock = (blockType: string) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      block_type: blockType,
      order_position: lesson.blocks?.length || 0,
      content: getDefaultBlockContent(blockType),
      rich_content: {},
      is_required: false
    };
    
    const updatedBlocks = [...(lesson.blocks || []), newBlock];
    handleLessonChange('blocks', updatedBlocks);
  };

  const getDefaultBlockContent = (blockType: string) => {
    switch (blockType) {
      case 'text':
        return { text: '', formatting: {} };
      case 'checklist':
        return { items: [], allow_due_dates: false };
      case 'video':
        return { url: '', platform: '' };
      case 'image':
        return { url: '', alt_text: '', caption: '' };
      case 'file':
        return { files: [] };
      case 'quiz':
        return { questions: [], pass_score: 80 };
      case 'acknowledgment':
        return { message: '', require_signature: true };
      default:
        return {};
    }
  };

  const updateContentBlock = (blockIndex: number, updatedBlock: any) => {
    const updatedBlocks = [...(lesson.blocks || [])];
    updatedBlocks[blockIndex] = updatedBlock;
    handleLessonChange('blocks', updatedBlocks);
  };

  const deleteContentBlock = (blockIndex: number) => {
    const updatedBlocks = (lesson.blocks || []).filter((_, index) => index !== blockIndex);
    handleLessonChange('blocks', updatedBlocks);
  };

  const blockTypes = [
    { value: 'text', label: 'Text Block' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'video', label: 'Video Embed' },
    { value: 'image', label: 'Image' },
    { value: 'file', label: 'File Attachment' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'acknowledgment', label: 'Acknowledgment' }
  ];

  return (
    <Card className="ml-4">
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
              value={lesson.title}
              onChange={(e) => handleLessonChange('title', e.target.value)}
              className="font-medium border-none p-0 h-auto"
              placeholder="Lesson title..."
            />
          </div>
          <Badge variant={lesson.is_required ? "default" : "secondary"}>
            {lesson.is_required ? "Required" : "Optional"}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <Input
              type="number"
              value={lesson.estimated_duration_minutes || 10}
              onChange={(e) => handleLessonChange('estimated_duration_minutes', parseInt(e.target.value))}
              className="w-16 h-6 text-xs"
              min="1"
            />
            <span>min</span>
          </div>
          <LessonSettingsDropdown onDelete={onDelete} />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Lesson Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Lesson Type</label>
                <Select 
                  value={lesson.lesson_type} 
                  onValueChange={(value) => handleLessonChange('lesson_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={lesson.is_required ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLessonChange('is_required', !lesson.is_required)}
                >
                  {lesson.is_required ? "Required" : "Make Required"}
                </Button>
              </div>
            </div>

            <Textarea
              value={lesson.description}
              onChange={(e) => handleLessonChange('description', e.target.value)}
              placeholder="Lesson description..."
              rows={2}
            />

            {/* Tags */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Tag className="h-3 w-3" />
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Select value={tagType} onValueChange={(value: any) => setTagType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['department', 'role', 'topic'].map(type => (
                  (lesson[`${type}_tags`] || []).map((tag, index) => (
                    <Badge
                      key={`${type}-${index}`}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag, type as any)}
                    >
                      {type}: {tag} ×
                    </Badge>
                  ))
                ))}
              </div>
            </div>

            {/* Content Blocks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium">Content Blocks</h5>
                <Select onValueChange={addContentBlock}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Add content block..." />
                  </SelectTrigger>
                  <SelectContent>
                    {blockTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <Plus className="h-3 w-3 mr-2 inline" />
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {(lesson.blocks || []).map((block, index) => (
                  <ContentBlockEditor
                    key={block.id}
                    block={block}
                    onUpdate={(updatedBlock) => updateContentBlock(index, updatedBlock)}
                    onDelete={() => deleteContentBlock(index)}
                  />
                ))}
                
                {(!lesson.blocks || lesson.blocks.length === 0) && (
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                    <p className="text-muted-foreground mb-2">No content blocks yet</p>
                    <p className="text-sm text-muted-foreground">Add text, images, videos, quizzes and more</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
