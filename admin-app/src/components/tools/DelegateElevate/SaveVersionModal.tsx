import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: string;
  timePerWeek?: number;
}

interface SaveVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onSave: (versionName: string, notes?: string) => Promise<void>;
  currentSession?: { id: string };
}

export default function SaveVersionModal({
  open,
  onOpenChange,
  tasks,
  onSave,
  currentSession
}: SaveVersionModalProps) {
  const [versionName, setVersionName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Generate default version name based on current date and time
  const generateDefaultName = () => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Version ${date} ${time}`;
  };

  const handleSave = async () => {
    if (!versionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a version name.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(versionName.trim(), notes.trim() || undefined);
      // Only clear form and close modal if save was successful
      setVersionName("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      logger.error('Error saving version:', error);
      // Don't close the modal on error, just show the error toast
      // The error toast is already handled in the parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTasks = () => {
    const exportData = {
      version_name: versionName || generateDefaultName(),
      notes,
      session_id: currentSession?.id,
      tasks,
      exported_at: new Date().toISOString(),
      summary: {
        total_tasks: tasks.length,
        tasks_by_quadrant: {
          'Love+Great': tasks.filter(t => t.quadrant === 'Love+Great').length,
          'Like+Good': tasks.filter(t => t.quadrant === 'Like+Good').length,
          'DontLike+Good': tasks.filter(t => t.quadrant === 'DontLike+Good').length,
          'DontLike+NotGood': tasks.filter(t => t.quadrant === 'DontLike+NotGood').length,
        }
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delegate-elevate-${versionName || generateDefaultName()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Your Delegate & Elevate data has been downloaded.",
    });
  };

  const handleCopyToClipboard = async () => {
    const exportData = {
      version_name: versionName || generateDefaultName(),
      notes,
      session_id: currentSession?.id,
      tasks,
      exported_at: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast({
        title: "Copied to Clipboard",
        description: "Your Delegate & Elevate data has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy data to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSaving) {
      // Only allow closing and clearing if not currently saving
      setVersionName("");
      setNotes("");
      onOpenChange(newOpen);
    } else if (newOpen) {
      // Always allow opening
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[560px] max-w-[95vw] bg-background border border-border shadow-lg z-50 max-h-[90vh] overflow-hidden"
        onPointerDownOutside={(e) => {
          // Prevent closing while saving
          if (isSaving) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing while saving
          if (isSaving) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Save Version</DialogTitle>
          <DialogDescription>
            Save a named version of your current Delegate & Elevate layout for future reference.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <Label htmlFor="version-name">Version Name</Label>
            <Input
              id="version-name"
              placeholder={generateDefaultName()}
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              maxLength={100}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this version..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full resize-none"
            />
          </div>

          <div className="bg-muted rounded-lg p-3 text-sm">
            <div className="font-medium mb-1">Current Summary:</div>
            <div className="text-muted-foreground">
              {tasks.length} total tasks across all quadrants
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 pt-4 border-t border-border">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              className="flex-1 sm:flex-none"
              disabled={isSaving}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTasks}
              className="flex-1 sm:flex-none"
              disabled={isSaving}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "Saving..." : "Save Version"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}