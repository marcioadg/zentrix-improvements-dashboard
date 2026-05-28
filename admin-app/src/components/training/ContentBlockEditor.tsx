import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { GripVertical, Trash2, Plus, Upload, Link, CheckSquare, Video, Image, FileText, HelpCircle, Shield } from 'lucide-react';
import { ContentBlockSettingsDropdown } from "./ContentBlockSettingsDropdown";

interface ContentBlockEditorProps {
  block: any;
  onUpdate: (block: any) => void;
  onDelete: () => void;
}

export const ContentBlockEditor: React.FC<ContentBlockEditorProps> = ({
  block,
  onUpdate,
  onDelete
}) => {
  const handleBlockChange = (field: string, value: any) => {
    onUpdate({ ...block, [field]: value });
  };

  const handleContentChange = (field: string, value: any) => {
    const updatedContent = { ...block.content, [field]: value };
    handleBlockChange('content', updatedContent);
  };

  const getBlockIcon = () => {
    switch (block.block_type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'checklist': return <CheckSquare className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      case 'acknowledgment': return <Shield className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderBlockContent = () => {
    switch (block.block_type) {
      case 'text':
        return <TextBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'checklist':
        return <ChecklistBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'video':
        return <VideoBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'image':
        return <ImageBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'file':
        return <FileBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'quiz':
        return <QuizBlockEditor block={block} onContentChange={handleContentChange} />;
      case 'acknowledgment':
        return <AcknowledgmentBlockEditor block={block} onContentChange={handleContentChange} />;
      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <Card className="ml-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          {getBlockIcon()}
          <Badge variant="outline">{block.block_type}</Badge>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-2">
            <Switch
              id={`required-${block.id}`}
              checked={block.is_required}
              onCheckedChange={(checked) => handleBlockChange('is_required', checked)}
            />
            <Label htmlFor={`required-${block.id}`} className="text-sm">Required</Label>
          </div>
          <ContentBlockSettingsDropdown onDelete={onDelete} />
        </div>
      </CardHeader>
      <CardContent>
        {renderBlockContent()}
      </CardContent>
    </Card>
  );
};

// Text Block Editor
const TextBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  return (
    <div className="space-y-3">
      <Textarea
        value={block.content.text || ''}
        onChange={(e) => onContentChange('text', e.target.value)}
        placeholder="Enter your text content here. Use **bold**, *italic*, and [links](url) for formatting."
        rows={6}
      />
      <div className="text-xs text-muted-foreground">
        Supports Markdown formatting: **bold**, *italic*, [links](url), # headers, • bullets
      </div>
    </div>
  );
};

// Checklist Block Editor
const ChecklistBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  const items = block.content.items || [];

  const addItem = () => {
    const newItems = [...items, { id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, text: '', due_date: null, required: false }];
    onContentChange('items', newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onContentChange('items', newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onContentChange('items', newItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Switch
          id="allow-due-dates"
          checked={block.content.allow_due_dates || false}
          onCheckedChange={(checked) => onContentChange('allow_due_dates', checked)}
        />
        <Label htmlFor="allow-due-dates">Allow due dates</Label>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id ?? index} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => updateItem(index, 'text', e.target.value)}
              placeholder="Checklist item..."
              className="flex-1"
            />
            {block.content.allow_due_dates && (
              <DatePicker
                date={item.due_date ? new Date(item.due_date + 'T00:00:00') : undefined}
                onSelect={(d) => updateItem(index, 'due_date', d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Due date"
              />
            )}
            <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Button size="sm" onClick={addItem}>
        <Plus className="h-3 w-3 mr-2" />
        Add Item
      </Button>
    </div>
  );
};

// Video Block Editor
const VideoBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  const detectPlatform = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('loom.com')) return 'loom';
    return 'other';
  };

  const handleUrlChange = (url: string) => {
    onContentChange('url', url);
    onContentChange('platform', detectPlatform(url));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Video URL</Label>
        <Input
          value={block.content.url || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="Paste YouTube, Vimeo, or Loom URL..."
        />
      </div>
      {block.content.platform && (
        <Badge variant="outline">Platform: {block.content.platform}</Badge>
      )}
      {block.content.url && (
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-sm text-muted-foreground">Video preview will appear here</p>
        </div>
      )}
    </div>
  );
};

// Image Block Editor
const ImageBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  return (
    <div className="space-y-3">
      <div>
        <Label>Image URL or Upload</Label>
        <div className="flex gap-2">
          <Input
            value={block.content.url || ''}
            onChange={(e) => onContentChange('url', e.target.value)}
            placeholder="Paste image URL or upload..."
            className="flex-1"
          />
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
      
      <div>
        <Label>Alt Text</Label>
        <Input
          value={block.content.alt_text || ''}
          onChange={(e) => onContentChange('alt_text', e.target.value)}
          placeholder="Describe the image for accessibility..."
        />
      </div>
      
      <div>
        <Label>Caption (optional)</Label>
        <Input
          value={block.content.caption || ''}
          onChange={(e) => onContentChange('caption', e.target.value)}
          placeholder="Image caption..."
        />
      </div>

      {block.content.url && (
        <div className="border rounded-lg p-4 bg-muted">
          <p className="text-sm text-muted-foreground">Image preview will appear here</p>
        </div>
      )}
    </div>
  );
};

// File Block Editor
const FileBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  const files = block.content.files || [];

  const addFile = () => {
    const newFiles = [...files, { name: '', url: '', size: 0, type: '' }];
    onContentChange('files', newFiles);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>File Attachments</Label>
        <Button size="sm" onClick={addFile}>
          <Plus className="h-3 w-3 mr-2" />
          Add File
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={index} className="flex items-center gap-2 p-2 border rounded">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name || 'New file'}</span>
            <Button size="sm" variant="outline" className="ml-auto">
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        Upload Files
      </Button>
    </div>
  );
};

// Quiz Block Editor
const QuizBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  const questions = block.content.questions || [];

  const addQuestion = () => {
    const newQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    };
    const newQuestions = [...questions, newQuestion];
    onContentChange('questions', newQuestions);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Quiz Questions</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Pass Score:</Label>
          <Input
            type="number"
            value={block.content.pass_score || 80}
            onChange={(e) => onContentChange('pass_score', parseInt(e.target.value))}
            className="w-16"
            min="0"
            max="100"
          />
          <span className="text-sm">%</span>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Input
                  value={question.question}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[index].question = e.target.value;
                    onContentChange('questions', newQuestions);
                  }}
                  placeholder="Enter your question..."
                />
                
                <div className="space-y-1">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        checked={question.correct_answer === optionIndex}
                        onChange={() => {
                          const newQuestions = [...questions];
                          newQuestions[index].correct_answer = optionIndex;
                          onContentChange('questions', newQuestions);
                        }}
                      />
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[index].options[optionIndex] = e.target.value;
                          onContentChange('questions', newQuestions);
                        }}
                        placeholder={`Option ${optionIndex + 1}...`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button size="sm" onClick={addQuestion}>
        <Plus className="h-3 w-3 mr-2" />
        Add Question
      </Button>
    </div>
  );
};

// Acknowledgment Block Editor
const AcknowledgmentBlockEditor: React.FC<{ block: any; onContentChange: (field: string, value: any) => void }> = ({
  block, onContentChange
}) => {
  return (
    <div className="space-y-3">
      <div>
        <Label>Acknowledgment Message</Label>
        <Textarea
          value={block.content.message || ''}
          onChange={(e) => onContentChange('message', e.target.value)}
          placeholder="Enter the acknowledgment message users must agree to..."
          rows={4}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="require-signature"
          checked={block.content.require_signature || false}
          onCheckedChange={(checked) => onContentChange('require_signature', checked)}
        />
        <Label htmlFor="require-signature">Require digital signature</Label>
      </div>
    </div>
  );
};
