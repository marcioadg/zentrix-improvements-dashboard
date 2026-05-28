import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEOSLife, EOS_LIFE_CATEGORIES } from '@/hooks/useEOSLife';
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const LifeHistory: React.FC = () => {
  const { sessions, isLoading, deleteSession } = useEOSLife();
  
  logger.log('📊 LifeHistory: sessions:', sessions.length, 'isLoading:', isLoading);
  // Prepare chart data
  const chartData = useMemo(() => {
    return sessions
      .slice()
      .reverse() // Show oldest to newest in chart
      .map(session => ({
        date: format(parseISO(session.session_date), 'MMM dd'),
        fullDate: session.session_date,
        overall: parseFloat(session.overall_average.toFixed(1)),
        'Do What You Love': session.ratings.do_what_you_love,
        'With People You Love': session.ratings.with_people_you_love,
        'Make Huge Difference': session.ratings.make_huge_difference,
        'Be Compensated': session.ratings.be_compensated_appropriately,
        'Time for Passions': session.ratings.time_for_passions,
      }));
  }, [sessions]);

  // Calculate trends
  const trends = useMemo(() => {
    if (sessions.length < 2) return {};
    
    const latest = sessions[0];
    const previous = sessions[1];
    
    const trends: Record<string, 'up' | 'down' | 'same'> = {};
    
    EOS_LIFE_CATEGORIES.forEach(category => {
      const latestRating = latest.ratings[category.key];
      const previousRating = previous.ratings[category.key];
      
      if (latestRating > previousRating) trends[category.key] = 'up';
      else if (latestRating < previousRating) trends[category.key] = 'down';
      else trends[category.key] = 'same';
    });
    
    return trends;
  }, [sessions]);

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-success/10 text-green-800 border-green-200';
    if (rating >= 6) return 'bg-warning/10 text-yellow-800 border-yellow-200';
    return 'bg-destructive/10 text-red-800 border-red-200';
  };

  const colors = [
    'hsl(var(--chart-3))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-4))',
  ];

  if (isLoading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No rating sessions yet. Start by rating your first day!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Life Score Trends</CardTitle>
          <CardDescription>Track your progress across all life areas over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 10]} />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? format(parseISO(item.fullDate), 'PPPP') : label;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  stroke="hsl(var(--foreground))" 
                  strokeWidth={3}
                  name="Overall Average"
                  dot={{ r: 4 }}
                />
                {EOS_LIFE_CATEGORIES.map((category, index) => (
                  <Line
                    key={category.key}
                    type="monotone"
                    dataKey={category.label}
                    stroke={colors[index]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Rating History</CardTitle>
          <CardDescription>View and manage your past life ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {format(parseISO(session.session_date), 'PPPP')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Overall Score: <span className="font-medium">{session.overall_average.toFixed(1)}</span>
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Session</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this rating session? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteSession(session.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {EOS_LIFE_CATEGORIES.map((category) => (
                    <div key={category.key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {category.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getRatingColor(session.ratings[category.key])}
                        >
                          {session.ratings[category.key]}
                        </Badge>
                        {trends[category.key] && getTrendIcon(trends[category.key])}
                      </div>
                    </div>
                  ))}
                </div>

                {session.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {session.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};