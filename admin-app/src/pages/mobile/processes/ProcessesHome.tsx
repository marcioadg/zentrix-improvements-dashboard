import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Sparkles, MoreVertical, Trash2, Download, CheckCircle2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileEmptyState } from '@/components/mobile/MobileEmptyState';
import { Badge } from '@/components/ui/badge';
import { BottomSheet, BottomSheetOption } from '@/components/ui/mobile-bottom-sheet';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useBusinessProcesses } from '@/hooks/mobile/processes/useBusinessProcesses';
import { useProcessMutations } from '@/hooks/mobile/processes/useProcessMutations';
import { CreateProcessSheet } from '@/components/mobile/processes/CreateProcessSheet';
import { AIGenerateSheet } from '@/components/mobile/processes/AIGenerateSheet';
import { exportProcessesToPDF, exportSingleProcessToPDF } from '@/utils/processExport';
import { cn } from '@/lib/utils';
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
import { toast } from 'sonner';

interface SortableProcessCardProps {
  process: any;
  onProcessClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  getDocumentationStatus: (stepCount: number) => { label: string; color: string };
}

const SortableProcessCard: React.FC<SortableProcessCardProps> = ({
  process,
  onProcessClick,
  onDeleteClick,
  getDocumentationStatus,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: process.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stepCount = process.major_steps?.length || 0;
  const status = getDocumentationStatus(stepCount);

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div
        onClick={() => onProcessClick(process.id)}
        className={cn(
          "bg-card border border-border/40 rounded-[6px] p-4 relative overflow-hidden",
          "cursor-pointer select-none touch-manipulation",
          "transition-all duration-100 ease-out",
          "hover:border-border hover:shadow-sm",
          isDragging && "shadow-lg ring-2 ring-primary/20 opacity-50"
        )}
      >
        {/* Status indicator edge */}
        <div className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
          stepCount >= 3 ? 'bg-[var(--success)]' : stepCount > 0 ? 'bg-orange-500' : 'bg-muted-foreground/30'
        )} />
        
        <div className="flex items-start gap-3 pl-2">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab touch-none mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate mb-1">
              {process.name}
            </h3>
            {process.owner && (
              <p className="text-sm text-muted-foreground truncate mb-2">
                Owner: {process.owner}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn('text-xs', status.color)}
              >
                {stepCount >= 3 && stepCount <= 7 && (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                {status.label}
              </Badge>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(process.id);
            }}
            className="p-2 -m-2 rounded-[6px] transition-colors hover:bg-muted shrink-0"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProcessesHome: React.FC = () => {
  const navigate = useNavigate();
  const { data: processes, isLoading } = useBusinessProcesses();
  const { deleteProcess, deleteAllProcesses, reorderProcesses } = useProcessMutations();
  
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showAISheet, setShowAISheet] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const handleProcessClick = (processId: string) => {
    navigate(`/processes/${processId}`);
  };

  const handleDeleteProcess = async () => {
    if (!selectedProcessId) return;
    try {
      await deleteProcess.mutateAsync(selectedProcessId);
      toast.success('Process deleted');
    } catch (error) {
      toast.error('Failed to delete process');
    }
    setShowDeleteDialog(false);
    setSelectedProcessId(null);
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllProcesses.mutateAsync();
      toast.success('All processes deleted');
    } catch (error) {
      toast.error('Failed to delete processes');
    }
    setShowDeleteAllDialog(false);
  };

  const handleExportAll = () => {
    if (processes && processes.length > 0) {
      exportProcessesToPDF(processes);
      toast.success('PDF exported');
    }
    setShowActionsSheet(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderProcesses.mutate({
        activeId: active.id as string,
        overId: over.id as string,
      });
    }
  };

  const getDocumentationStatus = (stepCount: number) => {
    if (stepCount >= 3 && stepCount <= 7) {
      return { label: 'Well documented', color: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--border)]' };
    } else if (stepCount < 3) {
      return { label: `Add ${3 - stepCount} more steps`, color: 'bg-orange-500/10 text-warning border-[var(--border)]' };
    } else {
      return { label: 'Consider consolidating', color: 'bg-[var(--active)]/10 text-[var(--active)] border-[var(--border)]' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <MobilePageHeader title="Processes" subtitle="Loading..." />
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[6px] bg-muted animate-pulse" />
          ))}
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobilePageHeader 
        title="Processes" 
        subtitle={processes?.length ? `${processes.length} documented` : undefined}
        showSearch
      >
        {/* Actions button */}
        <button
          onClick={() => setShowActionsSheet(true)}
          className="absolute right-4 top-4 p-2 rounded-[6px] bg-muted/60 transition-all active:scale-95"
        >
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </MobilePageHeader>

      <div className="px-4">
        {!processes || processes.length === 0 ? (
          <MobileEmptyState
            icon={FileText}
            title="No processes yet"
            description="Document your core business workflows to ensure consistency and clarity."
            actionLabel="Create Process"
            onAction={() => setShowCreateSheet(true)}
            secondaryActionLabel="Generate with AI"
            onSecondaryAction={() => setShowAISheet(true)}
          />
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={processes.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {processes.map((process) => (
                <SortableProcessCard
                  key={process.id}
                  process={process}
                  onProcessClick={handleProcessClick}
                  onDeleteClick={(id) => {
                    setSelectedProcessId(id);
                    setShowDeleteDialog(true);
                  }}
                  getDocumentationStatus={getDocumentationStatus}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Action Buttons */}
      {processes && processes.length > 0 && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-10">
          <button
            onClick={() => setShowAISheet(true)}
            className={cn(
              "w-14 h-14 rounded-[6px] flex items-center justify-center",
              "bg-secondary text-secondary-foreground",
              "shadow-lg shadow-secondary/20",
              "transition-all duration-150 active:scale-95"
            )}
          >
            <Sparkles className="h-6 w-6" />
          </button>
          <button
            onClick={() => setShowCreateSheet(true)}
            className={cn(
              "w-14 h-14 rounded-[6px] flex items-center justify-center",
              "bg-primary text-primary-foreground",
              "shadow-lg shadow-primary/30",
              "transition-all duration-150 active:scale-95"
            )}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Actions Bottom Sheet */}
      <BottomSheet
        isOpen={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        title="Actions"
      >
        <div className="space-y-2">
          <BottomSheetOption
            icon={<Download className="h-5 w-5" />}
            label="Export All to PDF"
            description="Download all processes as a single PDF"
            onClick={handleExportAll}
          />
          <BottomSheetOption
            icon={<Trash2 className="h-5 w-5" />}
            label="Clear All Processes"
            description="Delete all documented processes"
            onClick={() => {
              setShowActionsSheet(false);
              setShowDeleteAllDialog(true);
            }}
            variant="destructive"
          />
        </div>
      </BottomSheet>

      {/* Create Process Sheet */}
      <CreateProcessSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
      />

      {/* AI Generate Sheet */}
      <AIGenerateSheet
        isOpen={showAISheet}
        onClose={() => setShowAISheet(false)}
      />

      {/* Delete Single Process Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Process</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this process and all its steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProcess}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Processes</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {processes?.length || 0} processes and their steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  );
};

export default ProcessesHome;
