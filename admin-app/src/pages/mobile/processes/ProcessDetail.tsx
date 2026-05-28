import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  GripVertical, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Trash2, 
  Edit2,
  Download,
  CheckCircle2,
  AlertCircle,
  Link2
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileCard } from '@/components/mobile/MobileCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useProcessDetail } from '@/hooks/mobile/processes/useProcessDetail';
import { useProcessMutations } from '@/hooks/mobile/processes/useProcessMutations';
import { exportSingleProcessToPDF } from '@/utils/processExport';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SortableMajorStepProps {
  step: any;
  isExpanded: boolean;
  onToggle: () => void;
  onAddMinorStep: (majorStepId: string, title: string) => void;
  onDeleteMajorStep: (id: string) => void;
  onDeleteMinorStep: (id: string) => void;
  onEditMinorStepLink: (step: any) => void;
  onReorderMinorSteps: (majorStepId: string, activeId: string, overId: string) => void;
  stepIndex: number;
}

const SortableMinorStep: React.FC<{ 
  step: any; 
  onDelete: () => void; 
  onEditLink: () => void;
  stepNumber: string 
}> = ({ 
  step, 
  onDelete,
  onEditLink,
  stepNumber 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 p-3 rounded-[6px] bg-muted/30",
        isDragging && "shadow-lg"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab touch-none mt-0.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <span className="text-xs font-medium text-muted-foreground min-w-[24px]">
        {stepNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{step.title}</p>
        {step.hyperlink && (
          <a
            href={step.hyperlink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        )}
      </div>
      <button
        onClick={onEditLink}
        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
        title="Add/Edit link"
      >
        <Link2 className={cn(
          "h-3.5 w-3.5",
          step.hyperlink ? "text-primary" : "text-muted-foreground"
        )} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
};

const SortableMajorStep: React.FC<SortableMajorStepProps> = ({
  step,
  isExpanded,
  onToggle,
  onAddMinorStep,
  onDeleteMajorStep,
  onDeleteMinorStep,
  onEditMinorStepLink,
  onReorderMinorSteps,
  stepIndex,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const [newMinorStep, setNewMinorStep] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddMinorStep = () => {
    if (newMinorStep.trim()) {
      onAddMinorStep(step.id, newMinorStep.trim());
      setNewMinorStep('');
    }
  };

  const handleMinorStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderMinorSteps(step.id, active.id as string, over.id as string);
    }
  };

  const minorSteps = step.minor_steps || [];

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <MobileCard className={cn(isDragging && "shadow-lg ring-2 ring-primary/20")}>
          <div className="flex items-start gap-3">
            <div {...attributes} {...listeners} className="cursor-grab touch-none mt-1">
              <GripVertical className="h-5 w-5 text-muted-foreground/50" />
            </div>
            
            <CollapsibleTrigger className="flex-1 flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{stepIndex + 1}</span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-medium text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {minorSteps.length} {minorSteps.length === 1 ? 'action' : 'actions'}
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </CollapsibleTrigger>

            <button
              onClick={() => onDeleteMajorStep(step.id)}
              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>

          <CollapsibleContent>
            <div className="mt-4 pl-11 space-y-2">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleMinorStepDragEnd}>
                <SortableContext items={minorSteps.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                  {minorSteps.map((minorStep: any, minorIndex: number) => (
                    <SortableMinorStep
                      key={minorStep.id}
                      step={minorStep}
                      stepNumber={`${stepIndex + 1}.${minorIndex + 1}`}
                      onDelete={() => onDeleteMinorStep(minorStep.id)}
                      onEditLink={() => onEditMinorStepLink(minorStep)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add Minor Step Input */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newMinorStep}
                  onChange={(e) => setNewMinorStep(e.target.value)}
                  placeholder="Add action item..."
                  className="flex-1 h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMinorStep();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddMinorStep}
                  disabled={!newMinorStep.trim()}
                  className="h-10 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </MobileCard>
      </Collapsible>
    </div>
  );
};

const ProcessDetail: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const { data: process, isLoading } = useProcessDetail(processId!);
  const { 
    addMajorStep, 
    deleteMajorStep, 
    addMinorStep, 
    deleteMinorStep,
    updateMinorStep,
    reorderMajorSteps,
    reorderMinorSteps 
  } = useProcessMutations();

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [newMajorStep, setNewMajorStep] = useState('');
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  const [deleteMinorId, setDeleteMinorId] = useState<string | null>(null);
  const [editingLinkStep, setEditingLinkStep] = useState<any>(null);
  const [linkValue, setLinkValue] = useState('');

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleAddMajorStep = async () => {
    if (!newMajorStep.trim() || !processId) return;
    try {
      await addMajorStep.mutateAsync({
        processId,
        title: newMajorStep.trim(),
      });
      setNewMajorStep('');
      toast.success('Step added');
    } catch (error) {
      toast.error('Failed to add step');
    }
  };

  const handleDeleteMajorStep = async () => {
    if (!deleteStepId) return;
    try {
      await deleteMajorStep.mutateAsync(deleteStepId);
      toast.success('Step deleted');
    } catch (error) {
      toast.error('Failed to delete step');
    }
    setDeleteStepId(null);
  };

  const handleAddMinorStep = async (majorStepId: string, title: string) => {
    try {
      await addMinorStep.mutateAsync({ majorStepId, title });
      toast.success('Action added');
    } catch (error) {
      toast.error('Failed to add action');
    }
  };

  const handleDeleteMinorStep = async () => {
    if (!deleteMinorId) return;
    try {
      await deleteMinorStep.mutateAsync(deleteMinorId);
      toast.success('Action deleted');
    } catch (error) {
      toast.error('Failed to delete action');
    }
    setDeleteMinorId(null);
  };

  const handleEditLink = (step: any) => {
    setEditingLinkStep(step);
    setLinkValue(step.hyperlink || '');
  };

  const handleSaveLink = async () => {
    if (!editingLinkStep) return;
    try {
      await updateMinorStep.mutateAsync({
        id: editingLinkStep.id,
        hyperlink: linkValue.trim() || null,
      });
      toast.success(linkValue.trim() ? 'Link saved' : 'Link removed');
    } catch (error) {
      toast.error('Failed to save link');
    }
    setEditingLinkStep(null);
    setLinkValue('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && processId) {
      reorderMajorSteps.mutate({
        processId,
        activeId: active.id as string,
        overId: over.id as string,
      });
    }
  };

  const handleReorderMinorSteps = (majorStepId: string, activeId: string, overId: string) => {
    reorderMinorSteps.mutate({ majorStepId, activeId, overId });
  };

  const handleExport = () => {
    if (process) {
      exportSingleProcessToPDF(process);
      toast.success('PDF exported');
    }
  };

  if (isLoading || !process) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <MobilePageHeader title="Process" showBackButton />
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[6px] bg-muted animate-pulse" />
          ))}
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const stepCount = process.major_steps?.length || 0;
  const getStatus = () => {
    if (stepCount >= 3 && stepCount <= 7) {
      return { icon: CheckCircle2, label: 'Well documented', color: 'text-[var(--success)]' };
    } else if (stepCount < 3) {
      return { icon: AlertCircle, label: `Add ${3 - stepCount} more steps`, color: 'text-warning' };
    } else {
      return { icon: AlertCircle, label: 'Consider consolidating', color: 'text-[var(--active)]' };
    }
  };
  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobilePageHeader 
        title={process.name} 
        subtitle={process.owner ? `Owner: ${process.owner}` : undefined}
        showBackButton
      />

      <div className="px-4 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2", status.color)}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{status.label}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Description */}
        {process.description && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-[6px] p-3">
            {process.description}
          </p>
        )}

        {/* Major Steps */}
        <div className="space-y-3">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext 
              items={(process.major_steps || []).map((s: any) => s.id)} 
              strategy={verticalListSortingStrategy}
            >
              {(process.major_steps || []).map((step: any, index: number) => (
                <SortableMajorStep
                  key={step.id}
                  step={step}
                  stepIndex={index}
                  isExpanded={expandedSteps.has(step.id)}
                  onToggle={() => toggleStep(step.id)}
                  onAddMinorStep={handleAddMinorStep}
                  onDeleteMajorStep={(id) => setDeleteStepId(id)}
                  onDeleteMinorStep={(id) => setDeleteMinorId(id)}
                  onEditMinorStepLink={handleEditLink}
                  onReorderMinorSteps={handleReorderMinorSteps}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add Major Step */}
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newMajorStep}
            onChange={(e) => setNewMajorStep(e.target.value)}
            placeholder="Add major step..."
            className="flex-1 h-12"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMajorStep();
              }
            }}
          />
          <Button
            onClick={handleAddMajorStep}
            disabled={!newMajorStep.trim() || addMajorStep.isPending}
            className="h-12 px-4"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Delete Major Step Dialog */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this step and all its actions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMajorStep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Minor Step Dialog */}
      <AlertDialog open={!!deleteMinorId} onOpenChange={() => setDeleteMinorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this action. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMinorStep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Link Dialog */}
      <Dialog open={!!editingLinkStep} onOpenChange={() => setEditingLinkStep(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Add a URL link to this action item for quick reference.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://example.com"
              type="url"
              className="h-12"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingLinkStep(null)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLink}
              disabled={updateMinorStep.isPending}
              className="flex-1 sm:flex-none"
            >
              {linkValue.trim() ? 'Save Link' : 'Remove Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
};

export default ProcessDetail;
