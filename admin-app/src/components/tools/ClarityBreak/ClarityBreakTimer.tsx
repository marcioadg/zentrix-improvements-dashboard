
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, Square } from 'lucide-react';

interface ClarityBreakTimerProps {
  totalMinutes: number;
  onTimeUpdate: (elapsed: number) => void;
  onComplete: () => void;
  isActive: boolean;
  initialElapsed?: number;
}

export default function ClarityBreakTimer({ 
  totalMinutes, 
  onTimeUpdate, 
  onComplete,
  isActive,
  initialElapsed = 0
}: ClarityBreakTimerProps) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [isPaused, setIsPaused] = useState(false);
  
  // Use refs to store callbacks and avoid dependency issues
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onCompleteRef = useRef(onComplete);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when callbacks change
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Independent timer that won't be affected by parent re-renders
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive || isPaused) return;

    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        onTimeUpdateRef.current(newElapsed);
        
        if (newElapsed >= totalMinutes * 60) {
          onCompleteRef.current();
          return prev; // Don't increment past total
        }
        
        return newElapsed;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused, totalMinutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remaining = Math.max(0, (totalMinutes * 60) - elapsed);
  const progress = (elapsed / (totalMinutes * 60)) * 100;

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex-1">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Time Remaining</span>
          <span>{formatTime(remaining)}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onComplete}
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
