import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Target, BarChart3, AlertTriangle, Calendar, Bot, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QuickActionsHub: React.FC = () => {
  const quickActions = [
    {
      title: "Create Task",
      icon: CheckSquare,
      href: "/tasks",
      color: "bg-primary hover:bg-primary/90"
    },
    {
      title: "Add Goal",
      icon: Target,
      href: "/goals",
      color: "bg-success hover:bg-success/90"
    },
    {
      title: "Add Metric",
      icon: BarChart3,
      href: "/metrics",
      color: "bg-accent hover:bg-accent/90"
    },
    {
      title: "Report Issue",
      icon: AlertTriangle,
      href: "/issues",
      color: "bg-warning hover:bg-warning/90"
    },
    {
      title: "Schedule Meeting",
      icon: Calendar,
      href: "/meetings",
      color: "bg-info hover:bg-info/90"
    },
    {
      title: "AI Assistant",
      icon: Bot,
      href: "/zentrixai",
      color: "bg-primary hover:bg-primary/90"
    }
  ];

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[320px]">
        {quickActions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            className="h-20 flex-col gap-2 hover:scale-105 transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            asChild
          >
            <Link to={action.href}>
              <div className={`p-2 rounded-[5px] ${action.color} text-white transition-colors duration-150`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">{action.title}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};