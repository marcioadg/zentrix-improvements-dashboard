import React from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const navigate = useNavigate();

  const recentNotifications = notifications.slice(0, 5);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quarter_halfway':
        return 'bg-primary/10 text-primary dark:text-primary';
      case 'goal_deadline_warning':
        return 'bg-warning/10 text-warning';
      case 'task_deadline_warning':
        return 'bg-destructive/10 text-destructive';
      case 'metric_stale':
        return 'bg-accent/10 text-accent-foreground';
      default:
        return 'bg-muted-foreground/10 text-foreground dark:text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quarter_halfway':
        return 'Quarter Update';
      case 'goal_deadline_warning':
        return 'Goal Deadline';
      case 'task_deadline_warning':
        return 'Task Deadline';
      case 'metric_stale':
        return 'Metric Update';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_status) {
      markAsRead(notification.id);
    }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead()}
            className="text-xs p-1 h-6"
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="h-[400px]">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="p-2">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group p-3 rounded-lg mb-2 transition-colors cursor-pointer ${
                  notification.read_status
                    ? 'bg-muted/30 hover:bg-muted/50'
                    : 'bg-background hover:bg-muted/30 border border-primary/20'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getTypeColor(notification.type)}`}
                      >
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {!notification.read_status && (
                        <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1 leading-tight">
                      {notification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete notification"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 5 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="w-full text-xs flex items-center justify-center gap-1"
            >
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}