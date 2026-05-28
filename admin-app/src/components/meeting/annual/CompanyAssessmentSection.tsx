import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Building2, TrendingUp, Users, Target, BarChart3, Check, Circle, Send, AlertTriangle } from 'lucide-react';
import { useCompanyAssessment, AssessmentWithProfile } from '@/hooks/meeting/useCompanyAssessment';
import { useAssessmentBroadcast } from '@/hooks/meeting/useAssessmentBroadcast';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface CompanyAssessmentSectionProps {
  teamId: string;
  meetingStateId?: string;
}

interface AssessmentCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  dimensions: string[];
}

const assessmentCategories: AssessmentCategory[] = [
  {
    id: 'vision',
    name: 'Vision & Direction',
    icon: Target,
    dimensions: [
      'Our company vision is documented in writing, effectively communicated, and embraced by everyone across the organization.',
      'We have a clearly defined long-term goal (10+ years) that is regularly shared and understood by all team members.',
      'Our ideal customer profile is well-defined, and all marketing and sales activities are aligned to target them.',
      'Our key differentiators are clearly articulated, and all external communications consistently highlight them.',
    ],
  },
  {
    id: 'values',
    name: 'Values & Culture',
    icon: Users,
    dimensions: [
      'Our core values are well-defined and consistently applied in hiring, performance reviews, recognition, and terminations.',
      'Everyone in our organization fits our culture and demonstrates our core values in their daily work.',
      'Our core business focus is clear, and all people, systems, and processes remain aligned with it.',
      'Our leadership team operates with openness, honesty, and a high degree of mutual trust.',
    ],
  },
  {
    id: 'people',
    name: 'People & Structure',
    icon: Building2,
    dimensions: [
      'Our organization chart clearly defines all roles and responsibilities, and is regularly reviewed and updated.',
      'Every person is in a role that matches their skills - they understand it, are motivated by it, and can perform it well.',
      'We have a documented and named process for how we deliver value to customers, used consistently by all sales team members.',
      'Everyone has their own focused priorities (no more than 7 per quarter) and actively works toward them.',
    ],
  },
  {
    id: 'execution',
    name: 'Execution & Rhythm',
    icon: TrendingUp,
    dimensions: [
      'Our organization follows a consistent meeting rhythm at all levels (weekly, quarterly, annually).',
      'All recurring meetings happen at the same day/time, follow a consistent agenda, and start and end on schedule.',
      'Teams effectively identify, discuss, and resolve issues for the long-term benefit of the entire company.',
      'Our key processes are documented, simplified, and consistently followed to deliver predictable results.',
    ],
  },
  {
    id: 'data',
    name: 'Data & Accountability',
    icon: BarChart3,
    dimensions: [
      'We have systems in place to regularly gather feedback from customers and employees to measure satisfaction.',
      'A weekly metrics dashboard is actively maintained and reviewed.',
      'Every person in the organization owns at least one metric they are accountable for weekly.',
      'We maintain and regularly review a budget (monthly or quarterly) to monitor financial health.',
    ],
  },
];

export const CompanyAssessmentSection: React.FC<CompanyAssessmentSectionProps> = ({ 
  teamId, 
  meetingStateId 
}) => {
  const [localRatings, setLocalRatings] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'rate' | 'results'>('rate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    myAssessment, 
    allAssessments, 
    loading, 
    submitAssessment,
    addRemoteAssessment
  } = useCompanyAssessment(meetingStateId || null);

  // Handle remote submissions optimistically
  const handleRemoteSubmission = useCallback((payload: { assessment?: AssessmentWithProfile }) => {
    if (payload.assessment) {
      addRemoteAssessment(payload.assessment);
    }
  }, [addRemoteAssessment]);

  const { publishSubmission } = useAssessmentBroadcast({
    teamId,
    onRemoteSubmission: handleRemoteSubmission
  });

  // Use saved ratings or local ratings
  const ratings = useMemo(() => {
    if (myAssessment?.ratings) {
      return { ...myAssessment.ratings, ...localRatings };
    }
    return localRatings;
  }, [myAssessment?.ratings, localRatings]);

  const handleRatingChange = (dimensionId: string, value: number) => {
    setLocalRatings(prev => ({ ...prev, [dimensionId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submittedAssessment = await submitAssessment(ratings);
      // Broadcast with full assessment data for instant sync
      await publishSubmission(true, submittedAssessment);
      setActiveTab('results');
    } catch (error) {
      logger.error('Failed to submit assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate statistics
  const totalDimensions = assessmentCategories.reduce((sum, cat) => sum + cat.dimensions.length, 0);
  const ratedDimensions = Object.keys(ratings).length;
  const submittedCount = allAssessments.filter(a => a.is_submitted).length;
  const isMySubmitted = myAssessment?.is_submitted || false;

  // Calculate percentage score (sum of ratings / max possible * 100)
  const getMyPercentageScore = (): number => {
    const allRatings = Object.values(ratings);
    if (allRatings.length === 0) return 0;
    const sum = allRatings.reduce((a, b) => a + b, 0);
    const maxPossible = totalDimensions * 5; // 20 questions * 5 max rating = 100
    return Math.round((sum / maxPossible) * 100);
  };

  // Aggregate results
  const getAggregatedStats = (dimensionId: string) => {
    const submittedAssessments = allAssessments.filter(a => a.is_submitted);
    const values = submittedAssessments
      .map(a => a.ratings[dimensionId])
      .filter(v => v !== undefined && v !== null) as number[];
    
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const myValue = ratings[dimensionId];
    const variance = values.length > 1 
      ? values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length 
      : 0;

    return { min, max, avg, myValue, variance, count: values.length };
  };

  const getCategoryAggregatedAvg = (categoryId: string) => {
    const category = assessmentCategories.find(c => c.id === categoryId);
    if (!category) return null;
    
    const stats = category.dimensions.map((_, idx) => 
      getAggregatedStats(`${categoryId}-${idx}`)
    ).filter(Boolean);
    
    if (stats.length === 0) return null;
    
    const avgOfAvgs = stats.reduce((sum, s) => sum + (s?.avg || 0), 0) / stats.length;
    return avgOfAvgs;
  };

  const getOverallTeamPercentage = (): number | null => {
    const submittedAssessments = allAssessments.filter(a => a.is_submitted);
    if (submittedAssessments.length === 0) return null;

    // Calculate average percentage across all submitted assessments
    const percentages = submittedAssessments.map(assessment => {
      const sum = Object.values(assessment.ratings).reduce((a: number, b: any) => a + (b || 0), 0);
      const maxPossible = totalDimensions * 5;
      return (sum / maxPossible) * 100;
    });

    return Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
  };

  // Color functions for 1-5 scale
  const getRatingColor = (rating: number | null | undefined) => {
    if (rating === null || rating === undefined) return 'text-muted-foreground';
    if (rating >= 4) return 'text-success dark:text-green-400';  // Strong
    if (rating >= 3) return 'text-primary dark:text-blue-400';    // Good
    if (rating >= 2) return 'text-warning dark:text-yellow-400'; // Needs work
    return 'text-destructive dark:text-red-400';                        // Weak
  };

  const getPercentageColor = (percentage: number | null) => {
    if (percentage === null) return 'text-muted-foreground';
    if (percentage >= 80) return 'text-success dark:text-green-400';   // Strong health
    if (percentage >= 60) return 'text-primary dark:text-blue-400';     // Good foundation
    if (percentage >= 40) return 'text-warning dark:text-yellow-400'; // Significant gaps
    return 'text-destructive dark:text-red-400';                              // Major issues
  };

  const getScoreInterpretation = (percentage: number | null): string => {
    if (percentage === null) return '';
    if (percentage >= 80) return 'Strong organizational health';
    if (percentage >= 60) return 'Good foundation with areas to improve';
    if (percentage >= 40) return 'Significant gaps to address';
    return 'Major issues requiring attention';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Company Assessment</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Rate your organization's health across {totalDimensions} dimensions (1=weak, 5=strong). Each participant submits their own assessment, then view aggregated team results.
        </p>
      </div>

      {/* Participants Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Participants:</span>
              <div className="flex items-center gap-1">
                {allAssessments.map((assessment) => (
                  <div key={assessment.user_id} className="relative">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={assessment.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {assessment.profile?.first_name?.[0] || '?'}
                        {assessment.profile?.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    {assessment.is_submitted ? (
                      <Check className="absolute -bottom-1 -right-1 h-4 w-4 text-white bg-green-500 rounded-full p-0.5" />
                    ) : (
                      <Circle className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground bg-background rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Badge variant={submittedCount === allAssessments.length && allAssessments.length > 0 ? 'default' : 'secondary'}>
              {submittedCount}/{allAssessments.length || 1} submitted
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => !isMySubmitted && setActiveTab('rate')}
            disabled={isMySubmitted}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rate'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            } ${isMySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isMySubmitted ? 'Submitted' : 'Your Ratings'}
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'results'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            Team Results
            {submittedCount > 0 && <span className="ml-2 text-xs">({submittedCount})</span>}
          </button>
        </nav>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rate' | 'results')}>

        {/* Rating Tab */}
        <TabsContent value="rate" className="space-y-4">
          {/* Rating Cards */}
          <div className="space-y-4">
          {assessmentCategories.map((category) => {
              const Icon = category.icon;
              
              return (
                <Card key={category.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {category.dimensions.map((dimension, idx) => {
                      const dimensionId = `${category.id}-${idx}`;
                      const currentValue = ratings[dimensionId] || 0;
                      
                      return (
                        <div key={dimensionId} className="space-y-3">
                          <p className="text-sm font-medium leading-relaxed">{dimension}</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-muted-foreground">Weak</span>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <Button
                                  key={value}
                                  variant={currentValue === value ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleRatingChange(dimensionId, value)}
                                  className={cn(
                                    "w-10 h-10 text-base font-semibold",
                                    currentValue === value && "ring-2 ring-primary ring-offset-2"
                                  )}
                                >
                                  {value}
                                </Button>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">Strong</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Submit Button */}
          <Card>
            <CardContent className="py-4">
              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                size="lg"
                disabled={ratedDimensions < totalDimensions || isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit My Assessment'}
              </Button>
              {ratedDimensions < totalDimensions && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Answer all {totalDimensions} questions to submit
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {submittedCount === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No submissions yet</p>
                <p className="text-sm text-muted-foreground">
                  Results will appear once team members submit their assessments
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Aggregated Overall Score */}
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Team Health Score</p>
                      <p className={cn("text-4xl font-bold", getPercentageColor(getOverallTeamPercentage()))}>
                        {getOverallTeamPercentage() ?? '-'}<span className="text-lg text-muted-foreground">%</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getScoreInterpretation(getOverallTeamPercentage())}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Responses</p>
                      <p className="text-2xl font-semibold text-foreground">{submittedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Legend */}
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-foreground mb-3">Score Interpretation</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">80-100%: Strong organizational health</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">60-79%: Good foundation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-muted-foreground">40-59%: Significant gaps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">Below 40%: Major issues</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aggregated Results by Category */}
              <div className="space-y-4">
                {assessmentCategories.map((category) => {
                  const Icon = category.icon;
                  const catAvg = getCategoryAggregatedAvg(category.id);
                  const catPercentage = catAvg !== null ? Math.round((catAvg / 5) * 100) : null;
                  
                  return (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Icon className="h-5 w-5 text-primary" />
                            {category.name}
                          </CardTitle>
                          <div className={cn("text-xl font-bold", getPercentageColor(catPercentage))}>
                            {catPercentage !== null ? `${catPercentage}%` : '-'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {category.dimensions.map((dimension, idx) => {
                          const dimensionId = `${category.id}-${idx}`;
                          const stats = getAggregatedStats(dimensionId);
                          const isHighVariance = stats && stats.variance > 1; // Adjusted for 1-5 scale
                          
                          return (
                            <div key={dimensionId} className="space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-2 flex-1">
                                  <p className="text-sm font-medium leading-relaxed">{dimension}</p>
                                  {isHighVariance && (
                                    <span title="High variance - discuss different perspectives">
                                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <span className={cn("text-sm font-semibold flex-shrink-0", getRatingColor(stats?.avg))}>
                                  Avg: {stats?.avg.toFixed(1) || '-'}
                                </span>
                              </div>
                              
                              {stats && (
                                <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                                  {/* Range bar (scaled to 1-5) */}
                                  <div 
                                    className="absolute h-full bg-primary/30"
                                    style={{
                                      left: `${((stats.min - 1) / 4) * 100}%`,
                                      width: `${((stats.max - stats.min) / 4) * 100}%`
                                    }}
                                  />
                                  {/* Average marker */}
                                  <div 
                                    className="absolute h-full w-1 bg-primary"
                                    style={{
                                      left: `${((stats.avg - 1) / 4) * 100}%`
                                    }}
                                  />
                                  {/* My value marker */}
                                  {stats.myValue && (
                                    <div 
                                      className="absolute h-full w-2 bg-accent-foreground rounded-full"
                                      style={{
                                        left: `${((stats.myValue - 1) / 4) * 100}%`
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                              
                              {stats && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Range: {stats.min} - {stats.max}</span>
                                  {stats.myValue && <span>Your rating: {stats.myValue}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Individual Submissions Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Individual Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allAssessments.filter(a => a.is_submitted).map((assessment) => {
                      const sum = Object.values(assessment.ratings).reduce((a: number, b: any) => a + (b || 0), 0);
                      const percentage = Math.round((sum / (totalDimensions * 5)) * 100);
                      
                      return (
                        <div key={assessment.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={assessment.profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {assessment.profile?.first_name?.[0] || '?'}
                                {assessment.profile?.last_name?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {assessment.profile?.first_name} {assessment.profile?.last_name}
                            </span>
                          </div>
                          <span className={cn("text-sm font-bold", getPercentageColor(percentage))}>
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
