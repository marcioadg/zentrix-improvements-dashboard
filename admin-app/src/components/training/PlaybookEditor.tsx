
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, Eye, Trash2, GripVertical } from 'lucide-react';
import { ModuleEditor } from './ModuleEditor';
import { PlaybookPreview } from './PlaybookPreview';
import { toastService } from '@/services/toastService';
import { useAutosave } from '@/hooks/useAutosave';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/utils/logger';

interface PlaybookEditorProps {
  playbookId?: string;
  initialData?: any;
  onSave?: (playbook: any) => void;
  onClose?: () => void;
}

export const PlaybookEditor: React.FC<PlaybookEditorProps> = ({
  playbookId,
  initialData,
  onSave,
  onClose
}) => {
  const { profile } = useProfile();
  const [playbook, setPlaybook] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    modules: [] as any[],
    is_active: false
  });
  const [newTag, setNewTag] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data when component mounts or initialData changes
  useEffect(() => {
    logger.log('PlaybookEditor: Loading initial data:', initialData);
    if (initialData) {
      setPlaybook({
        title: initialData.title || '',
        description: initialData.description || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags : [],
        modules: Array.isArray(initialData.modules) ? initialData.modules : [],
        is_active: initialData.is_active || false
      });
    }
  }, [initialData]);

  const handlePlaybookChange = (field: string, value: any) => {
    logger.log('PlaybookEditor: Updating field:', field, 'with value:', value);
    setPlaybook(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePlaybook = async (playbookData: any) => {
    if (!profile?.company_id) {
      logger.error('Cannot save playbook: no company assigned');
      toastService.error("Cannot save playbook: no company assigned");
      return;
    }

    if (!playbookData.title.trim()) {
      toastService.error("Please enter a playbook title");
      return;
    }

    try {
      setIsSaving(true);
      logger.log('PlaybookEditor: Saving playbook:', playbookData);
      await onSave?.(playbookData);
      logger.log('PlaybookEditor: Save completed successfully');
      // Note: Success toast removed as per plan
    } catch (error) {
      logger.error('PlaybookEditor: Save failed:', error);
      // Error toast is handled in the usePlaybooks hook
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !playbook.tags.includes(newTag.trim())) {
      handlePlaybookChange('tags', [...playbook.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handlePlaybookChange('tags', playbook.tags.filter(tag => tag !== tagToRemove));
  };

  const addModule = () => {
    const newModule = {
      id: `module-${Date.now()}`,
      title: 'New Module',
      description: '',
      order_position: playbook.modules.length,
      is_required: true,
      lessons: []
    };
    logger.log('PlaybookEditor: Adding new module:', newModule);
    handlePlaybookChange('modules', [...playbook.modules, newModule]);
  };

  const updateModule = (moduleIndex: number, updatedModule: any) => {
    logger.log('PlaybookEditor: Updating module at index:', moduleIndex, 'with:', updatedModule);
    if (!Array.isArray(playbook.modules)) {
      logger.error('playbook.modules is not an array:', playbook.modules);
      return;
    }
    
    const updatedModules = [...playbook.modules];
    updatedModules[moduleIndex] = updatedModule;
    handlePlaybookChange('modules', updatedModules);
  };

  const deleteModule = (moduleIndex: number) => {
    logger.log('PlaybookEditor: Deleting module at index:', moduleIndex);
    if (!Array.isArray(playbook.modules)) {
      logger.error('playbook.modules is not an array:', playbook.modules);
      return;
    }
    
    const updatedModules = playbook.modules.filter((_, index) => index !== moduleIndex);
    handlePlaybookChange('modules', updatedModules);
  };

  const handleManualSave = async () => {
    await handleSavePlaybook(playbook);
  };

  const handlePublish = async () => {
    try {
      const publishedPlaybook = { ...playbook, is_active: true };
      await handleSavePlaybook(publishedPlaybook);
      
      // Success toast removed as per plan
    } catch (error) {
      logger.error('Error publishing playbook:', error);
      // Error handling is done in handleSavePlaybook
    }
  };

  if (isPreviewMode) {
    return (
      <PlaybookPreview 
        playbook={playbook} 
        onClose={() => setIsPreviewMode(false)} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              value={playbook.title}
              onChange={(e) => handlePlaybookChange('title', e.target.value)}
              placeholder="Playbook Title"
              className="text-xl font-semibold border-none p-0 h-auto"
            />
            <Textarea
              value={playbook.description}
              onChange={(e) => handlePlaybookChange('description', e.target.value)}
              placeholder="Playbook description..."
              className="mt-2 border-none p-0 resize-none"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Badge variant="outline">Saving...</Badge>}
            <Button variant="outline" onClick={() => setIsPreviewMode(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleManualSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handlePublish} disabled={isSaving}>
              Publish
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="w-32"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button size="sm" onClick={addTag}>Add Tag</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {playbook.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modules</h3>
              <Button onClick={addModule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>

            <div className="space-y-4">
              {Array.isArray(playbook.modules) && playbook.modules.length > 0 ? (
                playbook.modules.map((module, index) => {
                  // Ensure module is a valid object before rendering
                  if (!module || typeof module !== 'object') {
                    logger.warn('Invalid module at index:', index, module);
                    return null;
                  }
                  
                  return (
                    <ModuleEditor
                      key={module.id || `module-${index}`}
                      module={module}
                      onUpdate={(updatedModule) => updateModule(index, updatedModule)}
                      onDelete={() => deleteModule(index)}
                    />
                  );
                })
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">No modules yet</p>
                      <Button onClick={addModule}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Module
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
