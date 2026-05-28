import React from 'react';
import { HeatmapCell } from '@/services/analytics2Service';

interface ActivityHeatmapProps {
  data: HeatmapCell[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max sessions for color scaling
  const maxSessions = Math.max(...data.map(d => d.sessions), 1);

  // Create a map for quick lookup
  const cellMap = new Map<string, number>();
  data.forEach(cell => {
    cellMap.set(`${cell.day}-${cell.hour}`, cell.sessions);
  });

  // Get color intensity based on session count
  const getColor = (sessions: number) => {
    if (sessions === 0) return 'bg-muted/20';
    const intensity = Math.min(sessions / maxSessions, 1);
    
    if (intensity > 0.75) return 'bg-primary';
    if (intensity > 0.5) return 'bg-primary/70';
    if (intensity > 0.25) return 'bg-primary/40';
    return 'bg-primary/20';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Session Activity Heatmap</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs">Less</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-primary/20" />
            <div className="w-4 h-4 rounded-sm bg-primary/40" />
            <div className="w-4 h-4 rounded-sm bg-primary/70" />
            <div className="w-4 h-4 rounded-sm bg-primary" />
          </div>
          <span className="text-xs">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1">
            {/* Day labels column */}
            <div className="flex flex-col gap-1 pt-8">
              {days.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-end pr-2 text-xs text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Hour columns */}
            <div className="flex-1">
              {/* Hour labels */}
              <div className="flex gap-1 mb-1">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 min-w-[24px] text-center text-xs text-muted-foreground"
                  >
                    {hour % 3 === 0 ? hour : ''}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              {days.map((day, dayIndex) => (
                <div key={day} className="flex gap-1 mb-1">
                  {hours.map((hour) => {
                    const sessions = cellMap.get(`${dayIndex}-${hour}`) || 0;
                    const color = getColor(sessions);

                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`flex-1 min-w-[24px] h-8 rounded-sm ${color} transition-colors hover:ring-2 hover:ring-primary/50 cursor-pointer`}
                        title={`${day} ${hour}:00 - ${sessions} sessions`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
