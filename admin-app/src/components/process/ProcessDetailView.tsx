import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Edit3,
  Share2,
  Eye,
  EyeOff,
  User,
  Plus,
  GripVertical,
  Trash2,
  Paperclip,
  Save,
  Camera,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { useAutosaveText } from "@/hooks/useAutosaveText";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logger } from '@/utils/logger';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  notes?: string;
  image_url?: string;
}

interface ProcessDetailViewProps {
  processId: string;
  onBack: () => void;
  showSimplifiedView: boolean;
  onToggleSimplifiedView: () => void;
}

function SortableStepItem({ 
  step, 
  index, 
  showSimplified, 
  onUpdate, 
  onDelete 
}: { 
  step: ProcessStep; 
  index: number; 
  showSimplified: boolean;
  onUpdate: (id: string, field: keyof ProcessStep, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(step.title);
  const [localDescription, setLocalDescription] = useState(step.description);
  const [localNotes, setLocalNotes] = useState(step.notes || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    onUpdate(step.id, 'title', localTitle);
    onUpdate(step.id, 'description', localDescription);
    onUpdate(step.id, 'notes', localNotes);
    setIsEditing(false);
    toast({ title: "Step updated successfully" });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `step-${step.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('process-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('process-images')
        .getPublicUrl(fileName);

      onUpdate(step.id, 'image_url', publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      logger.error('Error uploading image:', error);
      toast({ title: "Error", description: "Failed to upload image" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate(step.id, 'image_url', '');
    toast({ title: "Image removed" });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-card border rounded-lg p-4 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
        </div>


        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="Step title..."
                className="font-medium"
              />
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="Step description..."
                rows={2}
              />
              {!showSimplified && (
                <Textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Additional notes (optional)..."
                  rows={2}
                  className="text-sm"
                />
              )}
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Camera className="w-3 h-3" />
                    {step.image_url ? 'Change Photo' : 'Add Photo'}
                  </Button>
                  {step.image_url && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleRemoveImage}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </Button>
                  )}
                </div>
                {step.image_url && (
                  <div className="relative inline-block">
                    <img 
                      src={step.image_url} 
                      alt="Step illustration" 
                      className="max-w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors cursor-pointer" 
                  onClick={() => setIsEditing(true)}>
                {step.title || 'Untitled Step'}
              </h4>
              <p className="text-muted-foreground text-sm mb-2">
                {step.description || 'No description provided'}
              </p>
              {step.image_url && (
                <div className="mb-2">
                  <img 
                    src={step.image_url} 
                    alt="Step illustration" 
                    className="max-w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
              {!showSimplified && step.notes && (
                <div className="bg-accent/30 rounded p-2 text-sm text-muted-foreground">
                  <strong>Notes:</strong> {step.notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsEditing(!isEditing)}
            className="h-9 w-9 p-0"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onDelete(step.id)}
            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProcessDetailView({ 
  processId, 
  onBack, 
  showSimplifiedView, 
  onToggleSimplifiedView 
}: ProcessDetailViewProps) {
  const { pages, updatePage } = useWikiPages();
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [processTitle, setProcessTitle] = useState('');
  const [processOwner, setProcessOwner] = useState('');
  const [lastReviewed, setLastReviewed] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const page = pages.find(p => p.id === processId);

  // Initialize data from page
  React.useEffect(() => {
    if (page) {
      setProcessTitle(page.title || '');
      
      // Parse steps from content_blocks
      try {
        const content = page.content_blocks?.[0];
        if (content && typeof content === 'string') {
          // Try to parse as JSON first, fallback to creating default steps
          try {
            const parsedSteps = JSON.parse(content);
            if (Array.isArray(parsedSteps)) {
              setSteps(parsedSteps);
            } else {
              // Create default step from content
              setSteps([{
                id: '1',
                title: 'Step 1',
                description: content,
                notes: ''
              }]);
            }
          } catch {
            // Create default step from HTML content
            setSteps([{
              id: '1',
              title: 'Step 1', 
              description: content.replace(/<[^>]*>/g, ''), // Strip HTML
              notes: ''
            }]);
          }
        }
      } catch (error) {
        logger.error('Error parsing process content:', error);
      }
    }
  }, [page]);

  // Auto-save title
  const { isSaving: isSavingTitle } = useAutosaveText(processTitle, {
    delay: 1000,
    onSave: async (title) => {
      if (page) {
        // Always save the title, even if empty - but provide a fallback
        const titleToSave = title.trim() || 'Untitled Process';
        await updatePage({ id: processId, patch: { title: titleToSave } });
      }
    },
  });

  // Auto-save steps
  const { isSaving: isSavingSteps } = useAutosaveText(JSON.stringify(steps), {
    delay: 2000,
    onSave: async (stepsJson) => {
      if (page) {
        await updatePage({ id: processId, patch: { content_blocks: [stepsJson] } });
      }
    },
  });

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Process not found</h2>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Processes
          </Button>
        </div>
      </div>
    );
  }

  const handleAddStep = () => {
    const newStep: ProcessStep = {
      id: Date.now().toString(),
      title: `Step ${steps.length + 1}`,
      description: '',
      notes: ''
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (id: string, field: keyof ProcessStep, value: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const handleDeleteStep = (id: string) => {
    setSteps(prev => prev.filter(step => step.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleShareWithTeam = () => {
    toast({ 
      title: "Process shared", 
      description: "Team members will be notified of the updated process." 
    });
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <Input
                value={processTitle}
                onChange={(e) => setProcessTitle(e.target.value)}
                className="text-2xl font-bold border-none px-0 shadow-none focus-visible:ring-0 bg-transparent"
                placeholder="Process Title"
              />
              {isSavingTitle && (
                <span className="text-xs text-muted-foreground">Saving title...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleSimplifiedView}>
              {showSimplifiedView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showSimplifiedView ? 'Full View' : 'Simplify'}
            </Button>
            <Button onClick={handleShareWithTeam} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share with Team
            </Button>
          </div>
        </header>

        {/* Metadata */}
        {!showSimplifiedView && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-accent/30 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Process Owner"
                value={processOwner}
                onChange={(e) => setProcessOwner(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker
                date={lastReviewed ? new Date(lastReviewed + 'T00:00:00') : undefined}
                onSelect={(d) => setLastReviewed(d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Last Reviewed"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleFileAttach} className="w-full">
                <Paperclip className="w-4 h-4 mr-2" />
                Attach Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    toast({ title: "Files attached", description: `${e.target.files.length} file(s) attached to process` });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Process Steps */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Process Steps
              {isSavingSteps && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  Saving...
                </Badge>
              )}
            </h2>
            <Button onClick={handleAddStep} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">No steps defined yet</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={steps.map(step => step.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      showSimplified={showSimplifiedView}
                      onUpdate={handleUpdateStep}
                      onDelete={handleDeleteStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}