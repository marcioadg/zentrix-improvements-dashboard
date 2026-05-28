import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import TaskModal from "./TaskModal";
import EditTaskModal from "./EditTaskModal";
import DeleteTaskConfirmation from "./DeleteTaskConfirmation";
import SaveVersionModal from "./SaveVersionModal";
import VersionHistoryModal from "./VersionHistoryModal";
import AutoSaveIndicator from "./AutoSaveIndicator";
import { ErrorBoundary } from "./ErrorBoundary";
import { Plus, Save, History, Pencil, Trash, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDelegateElevateSessions } from "@/hooks/useDelegateElevateSessions";
import { useDelegateElevateTasks } from "@/hooks/useDelegateElevateTasks";
import { useDelegateElevateVersions } from "@/hooks/useDelegateElevateVersions";
import { useAutosave } from "@/hooks/useAutosave";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';

type Quadrant = "Love+Great" | "Like+Good" | "DontLike+Good" | "DontLike+NotGood";

const VALID_QUADRANTS = ["Love+Great", "Like+Good", "DontLike+Good", "DontLike+NotGood"] as const;

interface DelegateElevateGridProps {
  inMeeting?: boolean;
  onRenderButtons?: (buttons: React.ReactNode) => void;
}

const QUADRANTS: Array<{ label: string; value: Quadrant; className: string }> = [
  { label: "Love + Great At", value: "Love+Great", className: "bg-success/5/50 border-green-200/50 hover:bg-success/5" },
  { label: "Like + Good At", value: "Like+Good", className: "bg-warning/5/50 border-yellow-200/50 hover:bg-warning/5" },
  { label: "Don't Like + Good At", value: "DontLike+Good", className: "bg-orange-50/50 border-orange-200/50 hover:bg-orange-50" },
  { label: "Don't Like + Not Good At", value: "DontLike+NotGood", className: "bg-destructive/5/50 border-red-200/50 hover:bg-destructive/5" },
];

// Utility functions
const isValidQuadrant = (quadrant: string): quadrant is Quadrant => {
  return VALID_QUADRANTS.includes(quadrant as Quadrant);
};

const safeGetQuadrant = (quadrant: string): Quadrant => {
  return isValidQuadrant(quadrant) ? quadrant : "Love+Great";
};

interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: Quadrant;
  timePerWeek?: number;
}

function DelegateElevateGridContent({ inMeeting = false, onRenderButtons }: DelegateElevateGridProps = {}) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use custom hooks with enhanced error handling
  const { currentSession, loading: sessionsLoading } = useDelegateElevateSessions();
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useDelegateElevateTasks(currentSession?.id || null);
  const { versions, loading: versionsLoading, saveVersion, refetchVersions } = useDelegateElevateVersions(currentSession?.id || null);

  // Enhanced debugging output
  const debugInfo = useMemo(() => ({
    user: !!user,
    userId: user?.id,
    currentSession: !!currentSession,
    sessionId: currentSession?.id,
    sessionsLoading,
    tasksLoading,
    versionsLoading,
    tasksCount: tasks?.length || 0,
    versionsCount: versions?.length || 0,
    errors: {
      component: error
    },
    timestamp: new Date().toISOString()
  }), [user, currentSession, sessionsLoading, tasksLoading, versionsLoading, tasks?.length, versions?.length, error]);

  logger.log('🔄 DelegateElevateGrid render:', debugInfo);

  // Convert database tasks to local format with validation
  const localTasks: Task[] = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) {
      logger.warn('⚠️ Tasks is not an array:', tasks);
      return [];
    }
    
    return tasks.map(task => {
      if (!task || typeof task !== 'object') {
        logger.warn('⚠️ Invalid task object:', task);
        return null;
      }
      
      const validatedTask: Task = {
        id: task.id || `temp-${crypto.randomUUID()}`,
        title: task.title || 'Untitled Task',
        description: task.description || undefined,
        quadrant: safeGetQuadrant(task.quadrant),
        timePerWeek: task.time_per_week || undefined,
      };
      
      return validatedTask;
    }).filter(Boolean) as Task[];
  }, [tasks]);

  // Auto-save function that creates versions with error handling
  const autoSaveFunction = useCallback(async (data: Task[]) => {
    if (!currentSession?.id) {
      logger.warn('⚠️ Auto-save skipped: No session ID');
      return;
    }
    
    if (!Array.isArray(data)) {
      logger.warn('⚠️ Auto-save skipped: Invalid data format');
      return;
    }
    
    try {
      const snapshot = {
        tasks: data,
        session_id: currentSession.id,
        timestamp: new Date().toISOString(),
      };
      
      await saveVersion(snapshot);
      logger.log('✅ Auto-save successful');
    } catch (error) {
      logger.error('❌ Auto-save failed:', error);
      setError('Auto-save failed. Your changes may not be saved automatically.');
    }
  }, [currentSession?.id, saveVersion, setError]);

  // Use autosave hook with enhanced conditions
  const autosaveEnabled = useMemo(() => {
    return !!(currentSession?.id && localTasks.length >= 0 && !sessionsLoading && !tasksLoading);
  }, [currentSession?.id, localTasks.length, sessionsLoading, tasksLoading]);

  const { hasUnsavedChanges, isSaving } = useAutosave(
    localTasks,
    autoSaveFunction,
    30000, // 30 seconds
    autosaveEnabled
  );

  // Enhanced error monitoring with user-specific debugging
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sessionsLoading || tasksLoading) {
        logger.error('⚠️ Loading timeout - user-specific issue detected:', {
          userId: user?.id,
          email: user?.email,
          currentSession: !!currentSession,
          sessionsLoading,
          tasksLoading,
          timestamp: new Date().toISOString()
        });
        setError(`Loading timeout detected. User: ${user?.email || 'Unknown'}. Please refresh the page.`);
      }
    }, 15000); // Reduced to 15 seconds for faster detection

    return () => clearTimeout(timeoutId);
  }, [sessionsLoading, tasksLoading, user?.id, user?.email, !!currentSession]);

  // Enhanced user validation with better error messages
  useEffect(() => {
    if (!user) return;

    if (!currentSession && !sessionsLoading && !tasksLoading) {
      logger.error('❌ Session creation failed for user:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      setError(`Session creation failed for ${user.email}. This may be a company access issue.`);
    }
  }, [user, currentSession, sessionsLoading, tasksLoading]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      logger.log('🔐 User not authenticated, redirecting to login');
      window.location.href = '/login';
    }
  }, [user]);

  // Define buttons JSX before early returns (for hook order consistency)
  const buttonsJSX = (
    <div className="flex flex-wrap gap-2 ml-auto">
      <Button 
        onClick={() => setShowVersionHistory(true)} 
        size="sm" 
        variant="outline" 
        className="flex gap-1 items-center text-xs md:text-sm"
      >
        <History className="w-3 h-3 md:w-4 md:h-4" /> 
        <span className="hidden sm:inline">Version History</span>
        <span className="sm:hidden">History</span>
      </Button>
      <Button 
        onClick={() => setShowSaveModal(true)} 
        size="sm" 
        variant="outline" 
        className="flex gap-1 items-center text-xs md:text-sm"
        disabled={localTasks.length === 0}
      >
        <Save className="w-3 h-3 md:w-4 md:h-4" /> 
        <span className="hidden sm:inline">Save Version</span>
        <span className="sm:hidden">Save</span>
      </Button>
      <Button 
        onClick={() => setShowModal(true)} 
        size="sm" 
        className="flex gap-1 items-center text-xs md:text-sm"
      >
        <Plus className="w-3 h-3 md:w-4 md:h-4" /> 
        <span className="hidden sm:inline">Add Task</span>
        <span className="sm:hidden">Add</span>
      </Button>
    </div>
  );

  // Call onRenderButtons if in meeting mode (must be before early returns)
  useEffect(() => {
    if (inMeeting && onRenderButtons) {
      onRenderButtons(buttonsJSX);
    }
  }, [inMeeting, onRenderButtons, localTasks.length]); // Re-render when tasks change (affects Save button disabled state)

  // Enhanced drag and drop with safety checks
  const onDrop = useCallback((quadrant: Quadrant, taskId: string) => {
    try {
      if (!taskId || !isValidQuadrant(quadrant)) {
        logger.warn('⚠️ Invalid drop operation:', { taskId, quadrant });
        return;
      }

      const task = tasks?.find(t => t.id === taskId);
      if (!task) {
        logger.warn('⚠️ Task not found for drop operation:', taskId);
        return;
      }

      if (task.quadrant !== quadrant) {
        logger.log('🔄 Moving task to new quadrant:', { taskId, from: task.quadrant, to: quadrant });
        updateTask(taskId, { quadrant });
      }
    } catch (error) {
      logger.error('❌ Error in onDrop:', error);
      toast({
        title: "Error Moving Task",
        description: "Failed to move the task. Please try again.",
        variant: "destructive",
      });
    }
  }, [tasks, updateTask, toast]);

  const handleAddTask = useCallback(async (taskData: Omit<Task, "id">) => {
    try {
      if (!taskData.title?.trim()) {
        toast({
          title: "Validation Error",
          description: "Task title is required.",
          variant: "destructive",
        });
        return;
      }

      if (!isValidQuadrant(taskData.quadrant)) {
        toast({
          title: "Validation Error",
          description: "Invalid quadrant selected.",
          variant: "destructive",
        });
        return;
      }

      await addTask({
        title: taskData.title.trim(),
        description: taskData.description?.trim(),
        quadrant: taskData.quadrant,
        time_per_week: taskData.timePerWeek,
      });
      setShowModal(false);
      toast({
        title: "Success",
        description: "Task added successfully.",
      });
    } catch (error) {
      logger.error('❌ Error adding task:', error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  }, [addTask, toast]);

  const handleEditTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      if (!taskId) {
        logger.warn('⚠️ No task ID provided for edit');
        return;
      }

      if (updates.title !== undefined && !updates.title?.trim()) {
        toast({
          title: "Validation Error",
          description: "Task title cannot be empty.",
          variant: "destructive",
        });
        return;
      }

      if (updates.quadrant && !isValidQuadrant(updates.quadrant)) {
        toast({
          title: "Validation Error",
          description: "Invalid quadrant selected.",
          variant: "destructive",
        });
        return;
      }

      const cleanUpdates = {
        title: updates.title?.trim(),
        description: updates.description?.trim(),
        quadrant: updates.quadrant,
        time_per_week: updates.timePerWeek,
      };

      await updateTask(taskId, cleanUpdates);
      setShowEditModal(false);
      setSelectedTask(null);
      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
    } catch (error) {
      logger.error('❌ Error editing task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  }, [updateTask, toast]);

  const handleDeleteTask = useCallback(async () => {
    if (!taskToDelete) {
      logger.warn('⚠️ No task to delete');
      return;
    }
    
    try {
      await deleteTask(taskToDelete.id);
      setShowDeleteConfirmation(false);
      setTaskToDelete(null);
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    } catch (error) {
      logger.error('❌ Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  }, [taskToDelete, deleteTask, toast]);

  const openEditModal = useCallback((task: Task) => {
    if (!task || !task.id) {
      logger.warn('⚠️ Invalid task for edit modal');
      return;
    }
    setSelectedTask(task);
    setShowEditModal(true);
  }, []);

  const openDeleteConfirmation = useCallback((task: Task) => {
    if (!task || !task.id) {
      logger.warn('⚠️ Invalid task for delete confirmation');
      return;
    }
    setTaskToDelete(task);
    setShowDeleteConfirmation(true);
  }, []);

  const handleSaveVersion = useCallback(async (versionName: string, notes?: string) => {
    if (!currentSession?.id) {
      toast({
        title: "Error",
        description: "No active session found. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const snapshot = {
        tasks: localTasks,
        session_id: currentSession.id,
        timestamp: new Date().toISOString(),
        version_name: versionName,
        notes: notes,
        summary: {
          total_tasks: localTasks.length,
          tasks_by_quadrant: {
            'Love+Great': localTasks.filter(t => t.quadrant === 'Love+Great').length,
            'Like+Good': localTasks.filter(t => t.quadrant === 'Like+Good').length,
            'DontLike+Good': localTasks.filter(t => t.quadrant === 'DontLike+Good').length,
            'DontLike+NotGood': localTasks.filter(t => t.quadrant === 'DontLike+NotGood').length,
          }
        }
      };
      
      await saveVersion(snapshot);
      toast({
        title: "Success",
        description: `Version "${versionName}" saved successfully.`,
      });
    } catch (error) {
      logger.error('❌ Error saving version:', error);
      toast({
        title: "Error",
        description: "Failed to save version. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  }, [currentSession?.id, localTasks, saveVersion, toast]);

  async function handleRestoreVersion(version: any) {
    if (!version.snapshot.tasks) return;
    
    try {
      // Clear current tasks and restore from version
      // Note: This is a simplified approach - in production you might want to
      // handle this more carefully with proper conflict resolution
      for (const versionTask of version.snapshot.tasks) {
        const existingTask = tasks.find(t => t.id === versionTask.id);
        if (existingTask) {
          await updateTask(versionTask.id, {
            title: versionTask.title,
            description: versionTask.description,
            quadrant: versionTask.quadrant,
            time_per_week: versionTask.timePerWeek,
          });
        } else {
          await addTask({
            title: versionTask.title,
            description: versionTask.description,
            quadrant: versionTask.quadrant,
            time_per_week: versionTask.timePerWeek,
          });
        }
      }
      
      setShowVersionHistory(false);
      toast({
        title: "Version Restored",
        description: "Successfully restored to the selected version",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteVersion(versionId: string) {
    // Note: You would need to implement deleteVersion in the hook
    toast({
      title: "Feature Coming Soon",
      description: "Version deletion will be available soon",
    });
  }

  // Enhanced loading state logic
  const isLoading = sessionsLoading || tasksLoading;
  const hasErrors = !!error;
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Please log in to use Delegate & Elevate</p>
        </div>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-2">Error loading session data</p>
          <p className="text-muted-foreground text-sm">{error || 'Please refresh the page or try again later.'}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your delegate & elevate session...</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {sessionsLoading && "Loading session..."}
            {tasksLoading && "Loading tasks..."}
          </p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No session found for {user?.email}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            This may be a company access issue. Contact support if refreshing doesn't help.
          </p>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Refresh Page
            </Button>
            <Button 
              onClick={() => {
                logger.log('🔍 Debug info for support:', debugInfo);
                navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
              }}
              variant="secondary"
              size="sm"
            >
              Copy Debug Info
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!inMeeting && (
        <div className="mb-4 md:mb-6 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <span className="text-sm md:text-lg text-muted-foreground">Drag your tasks into the right quadrant</span>
            <AutoSaveIndicator 
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
            />
          </div>
          {buttonsJSX}
        </div>
      )}
      
      {inMeeting && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base text-muted-foreground">Drag your tasks into the right quadrant</span>
            <AutoSaveIndicator 
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
      
      <div className={`grid grid-cols-1 md:grid-cols-2 grid-rows-4 md:grid-rows-2 gap-3 md:gap-4 min-h-[800px] ${inMeeting ? 'md:min-h-[600px]' : 'md:min-h-[400px]'}`}>
        {QUADRANTS.map((q) => (
          <div
            key={q.value}
            className={`rounded-lg p-3 md:p-4 flex flex-col ${q.className} min-h-[180px] md:min-h-[200px] border transition-colors duration-150`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedId && isValidQuadrant(q.value)) {
                onDrop(q.value, draggedId);
              }
              setDraggedId(null);
            }}
          >
            <div className="font-semibold mb-2 md:mb-3 text-sm md:text-base text-foreground">{q.label}</div>
            <div className="flex flex-col gap-2 flex-1">
              {localTasks.filter(t => t.quadrant === q.value).map(t => (
                <div
                  key={t.id}
                  className="bg-card border border-border rounded-md p-2 md:p-3 cursor-move hover:shadow-sm hover:border-border/60 transition-all duration-150 group relative touch-manipulation"
                  draggable={!!t.id}
                  onDragStart={(e) => {
                    if (t.id) {
                      setDraggedId(t.id);
                      e.dataTransfer.effectAllowed = 'move';
                    } else {
                      e.preventDefault();
                    }
                  }}
                  onDragEnd={(e) => {
                    setDraggedId(null);
                    e.dataTransfer.clearData();
                  }}
                >
                  {/* Action buttons - always visible on mobile, hover on desktop */}
                  <div className="absolute top-1 md:top-2 right-1 md:right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(t);
                      }}
                    >
                      <Pencil className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-background/80 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmation(t);
                      }}
                    >
                      <Trash className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </Button>
                  </div>

                  <div className="font-medium text-card-foreground pr-10 md:pr-12 text-sm md:text-base">{t.title}</div>
                  {t.description && <div className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                  {t.timePerWeek !== undefined && (
                    <div className="text-xs mt-1 md:mt-2 text-muted-foreground bg-muted rounded px-1.5 md:px-2 py-0.5 md:py-1 inline-block">
                      ~{t.timePerWeek} hr/week
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <TaskModal open={showModal} onOpenChange={setShowModal} onSave={handleAddTask} />
      
      <EditTaskModal 
        open={showEditModal} 
        onOpenChange={setShowEditModal} 
        task={selectedTask}
        onSave={handleEditTask} 
      />

      <DeleteTaskConfirmation
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        onConfirm={handleDeleteTask}
        taskTitle={taskToDelete?.title || ""}
      />
      
      <VersionHistoryModal 
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        versions={versions}
        onRestoreVersion={handleRestoreVersion}
        onDeleteVersion={handleDeleteVersion}
        loading={versionsLoading}
      />
      
      <SaveVersionModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        tasks={localTasks}
        onSave={handleSaveVersion}
        currentSession={currentSession}
      />
      <DelegateElevateSummary tasks={localTasks} />
    </>
  );
}

export default function DelegateElevateGrid({ inMeeting, onRenderButtons }: DelegateElevateGridProps = {}) {
  return (
    <ErrorBoundary>
      <DelegateElevateGridContent inMeeting={inMeeting} onRenderButtons={onRenderButtons} />
    </ErrorBoundary>
  );
}

function DelegateElevateSummary({ tasks }: { tasks: Task[] }) {
  const toDelegate = tasks.filter(t =>
    t.quadrant === "DontLike+Good" || t.quadrant === "DontLike+NotGood"
  );
  const zoneOfGenius = tasks.filter(t =>
    t.quadrant === "Love+Great"
  );
  
  if (tasks.length === 0) return null;
  
  return (
    <div className="mt-6 md:mt-8 bg-muted rounded-lg p-4 md:p-6 border border-border">
      <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4 text-foreground">Summary</h3>
      <div className="space-y-2 md:space-y-3">
        <div>
          <strong className="text-foreground text-sm md:text-base">Tasks to delegate immediately:</strong>{" "}
          <span className="text-amber-700 font-medium text-sm md:text-base block md:inline mt-1 md:mt-0">
            {toDelegate.length === 0 ? "None" : toDelegate.map(t => t.title).join(", ")}
          </span>
        </div>
        <div>
          <strong className="text-foreground text-sm md:text-base">Zone of Genius:</strong>{" "}
          <span className="text-primary font-medium text-sm md:text-base block md:inline mt-1 md:mt-0">
            {zoneOfGenius.length === 0 ? "None" : zoneOfGenius.map(t => t.title).join(", ")}
          </span>
        </div>
      </div>
    </div>
  );
}
