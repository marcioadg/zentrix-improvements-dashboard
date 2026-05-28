import { Card, CardContent } from '@/components/ui/card';
import { Clock, Activity, MapPin } from 'lucide-react';
import { UserSessionDetail } from '@/services/analytics2Service';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: UserSessionDetail;
}

export const SessionCard = ({ session }: SessionCardProps) => {
  const startDate = new Date(session.session_start);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const isActive = session.status === 'active';
  const duration = session.duration_minutes || 0;
  const maxDuration = 120; // Max for progress bar
  const progressPercent = Math.min((duration / maxDuration) * 100, 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Date & Time */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">📅 {formattedDate}</span>
              <span className="text-sm text-muted-foreground">{formattedTime}</span>
            </div>

            {/* Duration Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration: {duration} min
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Status & End Reason */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span
                  className={`font-medium ${
                    isActive ? '[color:var(--success)]' : 'text-muted-foreground'
                  }`}
                >
                  {isActive ? 'Active' : 'Ended'}
                </span>
              </div>

              {session.end_reason && (
                <span className="text-muted-foreground">
                  End: {session.end_reason}
                </span>
              )}

              {isActive && session.last_heartbeat && (
                <span className="text-muted-foreground">
                  Last: {formatDistanceToNow(new Date(session.last_heartbeat), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Company */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3 w-3" />
              {session.company_name}
            </div>
          </div>

          {/* Right: Status Badge */}
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isActive
                ? '[color:var(--success)] [background:color-mix(in_srgb,var(--success)_12%,transparent)]'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isActive ? '🟢 Active' : '⚫ Ended'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
