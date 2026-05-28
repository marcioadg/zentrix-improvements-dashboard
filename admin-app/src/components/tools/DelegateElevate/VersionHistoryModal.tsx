
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Download, Trash2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: "Love+Great" | "Like+Good" | "DontLike+Good" | "DontLike+NotGood";
  timePerWeek?: number;
}

interface Version {
  id: string;
  session_id: string;
  snapshot: {
    tasks: Task[];
    session_id: string;
    timestamp: string;
    version_name?: string;
  };
  created_by?: string;
  created_at: string;
}

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: Version[];
  onRestoreVersion: (version: Version) => void;
  onDeleteVersion: (versionId: string) => void;
  loading: boolean;
}

export default function VersionHistoryModal({
  open,
  onOpenChange,
  versions,
  onRestoreVersion,
  onDeleteVersion,
  loading
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const isAutoSave = (version: Version) => {
    return version.snapshot.version_name?.startsWith('Auto-save') || 
           !version.snapshot.version_name;
  };

  const getVersionName = (version: Version) => {
    return version.snapshot.version_name || `Auto-save at ${new Date(version.created_at).toLocaleTimeString()}`;
  };

  const getTaskSummary = (tasks: Task[]) => {
    const counts = {
      "Love+Great": 0,
      "Like+Good": 0,
      "DontLike+Good": 0,
      "DontLike+NotGood": 0
    };
    
    tasks.forEach(task => {
      counts[task.quadrant]++;
    });

    return counts;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[60vh]">
          {/* Version List */}
          <div className="w-1/2 border-r pr-4">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No versions saved yet
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => {
                    const taskSummary = getTaskSummary(version.snapshot.tasks || []);
                    const totalTasks = Object.values(taskSummary).reduce((a, b) => a + b, 0);
                    
                    return (
                      <div
                        key={version.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedVersion?.id === version.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-card hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {getVersionName(version)}
                              </span>
                              <Badge variant={isAutoSave(version) ? "secondary" : "default"} className="text-xs">
                                {isAutoSave(version) ? "Auto" : "Manual"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {totalTasks} task{totalTasks !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Version</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this version? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteVersion(version.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Version Preview */}
          <div className="w-1/2 pl-4">
            {selectedVersion ? (
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">
                    {getVersionName(selectedVersion)}
                  </h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Saved {formatDistanceToNow(new Date(selectedVersion.created_at), { addSuffix: true })}
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={() => onRestoreVersion(selectedVersion)}
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Restore This Version
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {["Love+Great", "Like+Good", "DontLike+Good", "DontLike+NotGood"].map((quadrant) => {
                      const quadrantTasks = (selectedVersion.snapshot.tasks || []).filter(
                        t => t.quadrant === quadrant
                      );
                      const labels = {
                        "Love+Great": "Love + Great At",
                        "Like+Good": "Like + Good At", 
                        "DontLike+Good": "Don't Like + Good At",
                        "DontLike+NotGood": "Don't Like + Not Good At"
                      };
                      
                      return (
                        <div key={quadrant} className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 text-sm">
                            {labels[quadrant as keyof typeof labels]} ({quadrantTasks.length})
                          </h4>
                          {quadrantTasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No tasks</p>
                          ) : (
                            <div className="space-y-1">
                              {quadrantTasks.map((task, index) => (
                                <div key={index} className="text-xs p-2 bg-muted rounded">
                                  <div className="font-medium">{task.title}</div>
                                  {task.description && (
                                    <div className="text-muted-foreground mt-1">{task.description}</div>
                                  )}
                                  {task.timePerWeek && (
                                    <div className="text-muted-foreground mt-1">~{task.timePerWeek} hr/week</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
