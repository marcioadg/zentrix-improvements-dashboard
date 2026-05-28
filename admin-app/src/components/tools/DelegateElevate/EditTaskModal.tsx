
import { useState, useEffect } from "react";
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Quadrant = "Love+Great" | "Like+Good" | "DontLike+Good" | "DontLike+NotGood";

interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: Quadrant;
  timePerWeek?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}

const QUADRANTS = [
  { label: "Love + Great At", value: "Love+Great" },
  { label: "Like + Good At", value: "Like+Good" },
  { label: "Don't Like + Good At", value: "DontLike+Good" },
  { label: "Don't Like + Not Good At", value: "DontLike+NotGood" }
];

export default function EditTaskModal({ open, onOpenChange, task, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState<number | undefined>();
  const [quadrant, setQuadrant] = useState<Quadrant>("Love+Great");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setTime(task.timePerWeek);
      setQuadrant(task.quadrant);
    }
  }, [task]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !title.trim()) return;
    
    onSave(task.id, { 
      title: title.trim(), 
      description: description.trim() || undefined, 
      timePerWeek: time, 
      quadrant 
    });
    
    onOpenChange(false);
  }

  return (
    <AccessibleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Task"
      description="Update the details of your task including its title, description, time commitment, and quadrant placement."
      className="sm:max-w-md"
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="edit-task-title">Task Title *</Label>
          <Input 
            id="edit-task-title"
            placeholder="Enter task title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-task-description">Description (optional)</Label>
          <Textarea 
            id="edit-task-description"
            placeholder="Add details about this task" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-task-time">Time per week (hours)</Label>
          <Input 
            id="edit-task-time"
            placeholder="e.g. 5" 
            type="number" 
            min={0} 
            step={0.5}
            value={time ?? ""} 
            onChange={e => setTime(Number(e.target.value) || undefined)} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-task-quadrant">Quadrant</Label>
          <select 
            id="edit-task-quadrant"
            value={quadrant} 
            onChange={e => setQuadrant(e.target.value as Quadrant)} 
            className="w-full rounded-[5px] border border-input bg-background px-3 py-2 text-[13px] ring-offset-background focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {QUADRANTS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </AccessibleDialog>
  );
}
