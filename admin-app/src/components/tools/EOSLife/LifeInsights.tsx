import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, Lightbulb } from 'lucide-react';
import { useEOSLife, EOS_LIFE_CATEGORIES } from '@/hooks/useEOSLife';

export const LifeInsights: React.FC = () => {
  const { sessions } = useEOSLife();

  const insights = useMemo(() => {
    if (sessions.length === 0) {
      return {
        averages: {},
        trends: {},
        recommendations: [],
        achievements: [],
        concerns: []
      };
    }

    // Calculate averages for each category
    const averages: Record<string, number> = {};
    EOS_LIFE_CATEGORIES.forEach(category => {
      const total = sessions.reduce((sum, session) => sum + session.ratings[category.key], 0);
      averages[category.key] = total / sessions.length;
    });

    // Calculate trends (last 7 sessions vs previous 7)
    const trends: Record<string, number> = {};
    if (sessions.length >= 2) {
      const recent = sessions.slice(0, Math.min(7, sessions.length));
      const previous = sessions.slice(7, Math.min(14, sessions.length));
      
      if (previous.length > 0) {
        EOS_LIFE_CATEGORIES.forEach(category => {
          const recentAvg = recent.reduce((sum, s) => sum + s.ratings[category.key], 0) / recent.length;
          const previousAvg = previous.reduce((sum, s) => sum + s.ratings[category.key], 0) / previous.length;
          trends[category.key] = recentAvg - previousAvg;
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const achievements: string[] = [];
    const concerns: string[] = [];

    EOS_LIFE_CATEGORIES.forEach(category => {
      const avg = averages[category.key];
      const trend = trends[category.key] || 0;

      if (avg >= 8) {
        achievements.push(`${category.label}: Excellent performance (${avg.toFixed(1)}/10)`);
      } else if (avg <= 4) {
        concerns.push(`${category.label}: Needs attention (${avg.toFixed(1)}/10)`);
        recommendations.push(`Focus on improving "${category.label}" - ${category.description.toLowerCase()}`);
      } else if (trend < -1) {
        concerns.push(`${category.label}: Declining trend (${trend.toFixed(1)} points)`);
        recommendations.push(`Address the decline in "${category.label}" before it becomes a bigger issue`);
      }

      if (trend > 1) {
        achievements.push(`${category.label}: Strong improvement (+${trend.toFixed(1)} points)`);
      }
    });

    // Overall recommendations
    if (Object.values(averages).every(avg => avg >= 7)) {
      achievements.push("Outstanding life balance across all areas!");
    }

    const lowestCategory = EOS_LIFE_CATEGORIES.reduce((lowest, category) => 
      averages[category.key] < averages[lowest.key] ? category : lowest
    );

    if (averages[lowestCategory.key] < 6) {
      recommendations.push(`Your lowest area is "${lowestCategory.label}". Consider setting specific goals to improve this.`);
    }

    return { averages, trends, recommendations, achievements, concerns };
  }, [sessions]);

  const getProgressColor = (value: number) => {
    if (value >= 8) return 'bg-green-500';
    if (value >= 6) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getTrendBadge = (trend: number) => {
    if (Math.abs(trend) < 0.1) return null;
    
    if (trend > 0) {
      return (
        <Badge variant="outline" className="text-success border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{trend.toFixed(1)}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-destructive border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          {trend.toFixed(1)}
        </Badge>
      );
    }
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Start tracking your life ratings to see personalized insights and recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Life Area Performance
          </CardTitle>
          <CardDescription>
            Average scores across all {sessions.length} rating sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {EOS_LIFE_CATEGORIES.map((category) => {
              const average = insights.averages[category.key] || 0;
              const trend = insights.trends[category.key] || 0;
              
              return (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{average.toFixed(1)}/10</span>
                      {getTrendBadge(trend)}
                    </div>
                  </div>
                  <Progress 
                    value={(average / 10) * 100} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      {insights.achievements.length > 0 && (
        <Card className="border-green-200 bg-success/5/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Award className="h-5 w-5" />
              Achievements & Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.achievements.map((achievement, index) => (
                <li key={index} className="flex items-start gap-2 text-success">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Concerns */}
      {insights.concerns.length > 0 && (
        <Card className="border-red-200 bg-destructive/5/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.concerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2 text-red-700">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card className="border-blue-200 bg-primary/5/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Actionable insights to improve your life balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-3 text-primary">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {sessions.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {sessions.length > 0 ? 
                  (sessions.reduce((sum, s) => sum + s.overall_average, 0) / sessions.length).toFixed(1) 
                  : '0.0'
                }
              </div>
              <p className="text-sm text-muted-foreground">Overall Average</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {sessions.length > 0 ? Math.max(...sessions.map(s => s.overall_average)).toFixed(1) : '0.0'}
              </div>
              <p className="text-sm text-muted-foreground">Best Score</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};