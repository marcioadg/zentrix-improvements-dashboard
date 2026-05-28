import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ExternalLink, Loader2, CheckCircle2, Circle, Edit3 } from 'lucide-react';
import { useReplacementLadder, Task } from '@/hooks/useReplacementLadder';

const ReplacementLadderView = () => {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  
  const {
    levels,
    loading,
    toggleTaskDelegation,
    updateTaskDetails,
    getTotalDelegated,
    generateDelegationRoadmap,
  } = useReplacementLadder();

  const handleUpdateTaskDetails = (levelId: number, taskId: string, updates: Partial<Task>) => {
    updateTaskDetails(levelId, taskId, updates);
    setEditingTask(null);
  };

  const { delegated, total } = getTotalDelegated();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Replacement Ladder</h1>
            <p className="text-muted-foreground mt-2">
              Climb the ladder by replacing yourself from low-leverage tasks to high-leverage founder work
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {delegated}/{total}
            </div>
            <div className="text-sm text-muted-foreground">Tasks Delegated</div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={generateDelegationRoadmap} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Delegation Roadmap
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {levels.map((level) => {
              const completedTasks = level.tasks.filter(t => t.isDelegated).length;
              const totalTasks = level.tasks.length;
              const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              
              return (
                <div key={level.id} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{level.title}</div>
                  <div className="text-lg font-bold">{level.hourlyRate}</div>
                  <div className="flex justify-center mt-2">
                    <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {completedTasks}/{totalTasks}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      <div className="grid gap-6">
        {levels.map((level) => (
          <Card key={level.id} className={level.isNonDelegable ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    🪜 {level.title}
                    <Badge variant="outline" className="ml-2">
                      {level.hourlyRate}
                    </Badge>
                  </CardTitle>
                  {level.isNonDelegable && (
                    <CardDescription className="text-amber-600 dark:text-amber-400 mt-1">
                      ❗ Founder-only responsibility - cannot be delegated
                    </CardDescription>
                  )}
                </div>
                <Badge variant={level.tasks.every(t => t.isDelegated) && !level.isNonDelegable ? "default" : "secondary"}>
                  {level.tasks.filter(t => t.isDelegated).length}/{level.tasks.length} delegated
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3">
                {level.tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`border rounded-lg p-4 transition-all ${
                      task.isDelegated 
                        ? 'bg-success/5 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                        : level.isNonDelegable 
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                          : 'bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {level.isNonDelegable ? (
                          <Circle className="h-5 w-5 text-amber-500" />
                        ) : task.isDelegated ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="font-medium text-sm">{task.name}</h4>
                          
                          {!level.isNonDelegable && (
                            <div className="flex items-center gap-2">
                              {task.isDelegated && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setEditingTask(task.id)}
                                  className="h-7 text-xs"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant={task.isDelegated ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => toggleTaskDelegation(level.id, task.id)}
                                className="h-7 text-xs transition-all"
                              >
                                {task.isDelegated ? "✓ Delegated" : "Delegate"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Delegated Task Details */}
                        {task.isDelegated && !level.isNonDelegable && (
                          <div className="mt-3 space-y-2">
                            {editingTask === task.id ? (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Owner name"
                                  value={task.owner || ''}
                                  onChange={(e) => handleUpdateTaskDetails(level.id, task.id, { owner: e.target.value })}
                                  className="h-8 text-xs"
                                />
                                <Textarea
                                  placeholder="Notes"
                                  value={task.notes || ''}
                                  onChange={(e) => handleUpdateTaskDetails(level.id, task.id, { notes: e.target.value })}
                                  className="min-h-[60px] text-xs"
                                />
                                <Input
                                  placeholder="SOP/Loom link"
                                  value={task.sopLink || ''}
                                  onChange={(e) => handleUpdateTaskDetails(level.id, task.id, { sopLink: e.target.value })}
                                  className="h-8 text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => setEditingTask(null)}
                                  className="h-7 text-xs"
                                >
                                  Save Details
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.owner && (
                                      <Badge variant="secondary" className="text-xs">
                                        Owner: {task.owner}
                                      </Badge>
                                    )}
                                    {task.sopLink && (
                                      <a 
                                        href={task.sopLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        SOP/Loom
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {task.notes && (
                                  <p className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                                    {task.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReplacementLadderView;