
import { useState } from "react";
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (d: { title: string; description?: string; timePerWeek?: number; quadrant: "Love+Great" | "Like+Good" | "DontLike+Good" | "DontLike+NotGood" }) => void;
}

const QUADRANTS = [
  { label: "Love + Great At", value: "Love+Great" },
  { label: "Like + Good At", value: "Like+Good" },
  { label: "Don't Like + Good At", value: "DontLike+Good" },
  { label: "Don't Like + Not Good At", value: "DontLike+NotGood" }
];

export default function TaskModal({ open, onOpenChange, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState<number | undefined>();
  const [quadrant, setQuadrant] = useState<"Love+Great" | "Like+Good" | "DontLike+Good" | "DontLike+NotGood">("Love+Great");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({ 
      title: title.trim(), 
      description: description.trim() || undefined, 
      timePerWeek: time, 
      quadrant 
    });
    
    // Reset form
    setTitle(""); 
    setDescription(""); 
    setTime(undefined); 
    setQuadrant("Love+Great");
    onOpenChange(false);
  }

  return (
    <AccessibleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Task"
      description="Add a new task to your delegate/elevate matrix with details about your relationship to the work."
      className="sm:max-w-md"
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="delegate-title">Task Title *</Label>
          <Input 
            id="delegate-title"
            placeholder="Enter task title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delegate-description">Description (optional)</Label>
          <Textarea 
            id="delegate-description"
            placeholder="Add details about this task" 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delegate-time">Time per week (hours)</Label>
          <Input 
            id="delegate-time"
            placeholder="e.g. 5" 
            type="number" 
            min={0} 
            step={0.5}
            value={time ?? ""} 
            onChange={e => setTime(Number(e.target.value) || undefined)} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delegate-quadrant">Quadrant</Label>
          <select 
            id="delegate-quadrant"
            value={quadrant} 
            onChange={e => setQuadrant(e.target.value as any)} 
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
          <Button type="submit">Add Task</Button>
        </div>
      </form>
    </AccessibleDialog>
  );
}
