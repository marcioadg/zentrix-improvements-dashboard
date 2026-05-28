
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Play, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ClarityBreak {
  id: string;
  user_id: string;
  company_id?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  insights?: string;
  session_prompts?: string[];
  created_at: string;
}

interface ClarityBreakResumeProps {
  session: ClarityBreak;
  onResumeSession: () => void;
  onAbandonSession: () => void;
  onStartNewSession: () => void;
  time: number;
  setTime: (time: number) => void;
}

export default function ClarityBreakResume({
  session,
  onResumeSession,
  onAbandonSession,
  onStartNewSession,
  time,
  setTime
}: ClarityBreakResumeProps) {
  const [showNewSessionOptions, setShowNewSessionOptions] = useState(false);

  const startedAt = new Date(session.started_at);
  const timeAgo = formatDistanceToNow(startedAt, { addSuffix: true });
  const sessionDuration = session.duration_minutes || 30;

  // Calculate elapsed time since session started
  const currentTime = new Date();
  const elapsedMinutes = Math.floor((currentTime.getTime() - startedAt.getTime()) / (1000 * 60));
  const isOverdue = elapsedMinutes > sessionDuration;

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Incomplete Session Found</h2>
        </div>
        
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <p>
            <strong>Started:</strong> {timeAgo}
          </p>
          <p>
            <strong>Planned Duration:</strong> {sessionDuration} minutes
          </p>
          {isOverdue && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Session has exceeded planned duration</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={onResumeSession}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            <Play className="w-4 h-4" />
            Resume Session
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowNewSessionOptions(!showNewSessionOptions)}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Start New
            </Button>
            
            <Button 
              onClick={onAbandonSession}
              variant="outline"
              className="flex-1 text-destructive hover:text-red-700"
            >
              Abandon
            </Button>
          </div>
        </div>
      </div>

      {showNewSessionOptions && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-medium mb-4">Start New Session</h3>
          <div className="flex gap-3 items-center justify-center mb-4">
            <input 
              type="number" 
              min={15} 
              max={120} 
              step={15} 
              value={time} 
              onChange={e => setTime(Number(e.target.value))} 
              className="rounded border p-2 w-20" 
            />
            <span className="text-muted-foreground text-sm">minutes</span>
          </div>
          <Button onClick={onStartNewSession} className="w-full">
            Start New Clarity Break
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will abandon your current incomplete session
          </p>
        </div>
      )}
    </div>
  );
}
