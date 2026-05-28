import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Plus, TrendingUp, TrendingDown, Minus, Users, Calendar, CheckCircle2, HeartPulse } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { useCompanyHealthAssessments, type HealthAssessment } from '@/hooks/useCompanyHealthAssessments';
import { useCompanyHealthResponse } from '@/hooks/useCompanyHealthResponse';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { logger } from '@/utils/logger';

// Assessment categories and dimensions (same as meeting version)
const COPY_FEEDBACK_DURATION_MS = 3000;
const ASSESSMENT_CATEGORIES = {
  vision: {
    title: "Vision & Direction",
    dimensions: {
      vision_shared: "Our company vision is clearly understood by everyone",
      goals_aligned: "Team goals are aligned with company objectives",
      strategy_clear: "Our strategic direction is well-communicated",
      priorities_known: "Everyone knows our top priorities"
    }
  },
  values: {
    title: "Values & Culture",
    dimensions: {
      values_lived: "Our core values are lived daily, not just stated",
      trust_high: "There is high trust between team members",
      feedback_open: "We give and receive feedback openly",
      accountability_strong: "People are held accountable constructively"
    }
  },
  people: {
    title: "People & Structure",
    dimensions: {
      right_seats: "We have the right people in the right seats",
      roles_clear: "Roles and responsibilities are clearly defined",
      growth_supported: "Professional development is actively supported",
      hiring_effective: "Our hiring process attracts great talent"
    }
  },
  execution: {
    title: "Execution & Rhythm",
    dimensions: {
      meetings_effective: "Our meetings are productive and focused",
      decisions_timely: "Decisions are made quickly and effectively",
      issues_resolved: "Problems are identified and solved promptly",
      momentum_strong: "We maintain consistent forward momentum"
    }
  },
  data: {
    title: "Data & Accountability",
    dimensions: {
      metrics_tracked: "Key metrics are tracked and reviewed regularly",
      performance_visible: "Performance data is visible to everyone",
      goals_measured: "Progress toward goals is measured objectively",
      learning_applied: "We learn from data and adjust accordingly"
    }
  }
};

const Health: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { companies, currentCompany, switchCompany, loading: companyLoading } = useMultiCompany();
  const { assessments, activeAssessment, loading, createAssessment, closeAssessment } = useCompanyHealthAssessments();
  const { myResponse, allResponses, saveRatings, submitRatings, loading: responseLoading } = useCompanyHealthResponse(activeAssessment?.id || null);
  const { hasDirectorAccess } = useCurrentUserPermissionLevel();
  
  const [newTitle, setNewTitle] = useState(`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} Health Check`);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>(myResponse?.ratings || {});
  const [activeTab, setActiveTab] = useState<'rate' | 'results'>('rate');
  const [companySwitchAttempted, setCompanySwitchAttempted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle company switching from URL parameter
  useEffect(() => {
    const companyIdFromUrl = searchParams.get('company');
    
    // Skip if no company param, already attempted, or still loading
    if (!companyIdFromUrl || companySwitchAttempted || companyLoading) {
      return;
    }

    // Check if already on the correct company
    if (currentCompany?.id === companyIdFromUrl) {
      // Clean up URL by removing company param (it's served its purpose)
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('company');
      setSearchParams(newParams, { replace: true });
      setCompanySwitchAttempted(true);
      return;
    }

    // Check if user has access to the requested company
    const targetCompany = companies.find(c => c.id === companyIdFromUrl);
    
    if (targetCompany) {
      // User has access - switch to the company
      setCompanySwitchAttempted(true);
      switchCompany(companyIdFromUrl).then(() => {
        // Clean up URL after successful switch
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('company');
        setSearchParams(newParams, { replace: true });
      }).catch((error) => {
        logger.error('Failed to switch company:', error);
        toast({
          title: "Could not switch company",
          description: "There was an error accessing the requested company.",
          variant: "destructive"
        });
      });
    } else if (companies.length > 0) {
      // User doesn't have access to this company
      setCompanySwitchAttempted(true);
      toast({
        title: "Company not accessible",
        description: "You don't have access to the company in this link. Showing your current company instead.",
        variant: "destructive"
      });
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('company');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, companies, currentCompany?.id, companyLoading, switchCompany, setSearchParams, toast, companySwitchAttempted]);

  // Sync ratings from myResponse
  useEffect(() => {
    if (myResponse?.ratings) {
      setRatings(myResponse.ratings);
    }
  }, [myResponse?.ratings]);

  const handleCopyLink = async () => {
    try {
      // Include company ID in the shareable link for proper routing
      const companyParam = currentCompany?.id ? `?company=${currentCompany?.id}` : '';
      const url = `${window.location.origin}/health${companyParam}`;

      await navigator.clipboard.writeText(url);

      setLinkCopied(true);

      // NOTE: Our shadcn-style useToast intentionally filters non-destructive toasts.
      // For user feedback here, use Sonner directly.
      sonnerToast('Link copied — send it to members of this company only.');

      // Reset button text after 3 seconds
      setTimeout(() => setLinkCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch (error) {
      logger.error('Failed to copy link:', error);
      sonnerToast.error("Couldn't copy link. Please copy it manually from the address bar.");
    }
  };

  const handleCreateAssessment = async () => {
    await createAssessment(newTitle);
    setCreateDialogOpen(false);
  };

  const handleRatingChange = (dimensionId: string, value: number) => {
    const updated = { ...ratings, [dimensionId]: value };
    setRatings(updated);
    saveRatings(updated);
  };

  const handleSubmit = () => {
    submitRatings(ratings);
  };

  const handleCloseAssessment = () => {
    if (!activeAssessment) return;
    const submittedResponses = allResponses.filter(r => r.is_submitted);
    const avgScore = calculateAverageScore(submittedResponses);
    closeAssessment(activeAssessment.id, avgScore, submittedResponses.length);
  };

  const calculateAverageScore = (responses: typeof allResponses) => {
    if (responses.length === 0) return 0;
    const totalDimensions = 20;
    const maxScore = totalDimensions * 5;
    
    const totalScore = responses.reduce((acc, r) => {
      const sum = Object.values(r.ratings || {}).reduce((s, v) => s + v, 0);
      return acc + sum;
    }, 0);
    
    return Math.round((totalScore / (responses.length * maxScore)) * 100);
  };

  const submittedResponses = allResponses.filter(r => r.is_submitted);
  const currentScore = calculateAverageScore(submittedResponses);
  const completedAssessments = assessments.filter(a => a.status === 'completed');

  // Chart data for historical trend
  const chartData = useMemo(() => {
    return completedAssessments
      .slice()
      .reverse()
      .map(a => ({
        name: format(new Date(a.assessment_date), 'MMM yyyy'),
        score: a.overall_score || 0,
        respondents: a.respondent_count
      }));
  }, [completedAssessments]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-status-success';
    if (score >= 60) return 'text-accent';
    if (score >= 40) return 'text-status-warning';
    return 'text-status-error';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Strong', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Needs Work', variant: 'destructive' as const };
  };

  const getTrendIcon = (current: number, previous: number | null) => {
    if (previous === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-status-success" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-status-error" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const ratedCount = Object.keys(ratings).length;
  const totalDimensions = 20;
  const progress = Math.round((ratedCount / totalDimensions) * 100);

  if (loading) {
    return (
      <div className="px-6 py-6 flex items-center justify-center min-h-[60vh]">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Company Health</h1>
          <p className="text-[13px] text-muted-foreground">Track and improve your organizational health over time</p>
        </div>
        <div className="flex items-center gap-2">
          {activeAssessment && (
            <Button variant="outline" onClick={handleCopyLink}>
              {linkCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-status-success" />
                  Link copied
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy link
                </>
              )}
            </Button>
          )}
          {hasDirectorAccess && !activeAssessment && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Assessment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Health Assessment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Assessment Title</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Q1 2025 Health Check"
                    />
                  </div>
                  <Button onClick={handleCreateAssessment} className="w-full">
                    Start Assessment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Active Assessment */}
      {activeAssessment ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeAssessment.title}
                  <Badge variant="default">Active</Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(activeAssessment.assessment_date), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {submittedResponses.length} responses
                  </span>
                </CardDescription>
              </div>
              {hasDirectorAccess && submittedResponses.length > 0 && (
                <Button variant="outline" onClick={handleCloseAssessment}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Assessment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rate' | 'results')}>
              <TabsList className="mb-4">
                <TabsTrigger value="rate">Your Ratings</TabsTrigger>
                <TabsTrigger value="results">Team Results</TabsTrigger>
              </TabsList>

              <TabsContent value="rate" className="space-y-6">
                {/* Progress */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ratedCount}/{totalDimensions} rated
                  </span>
                  {myResponse?.is_submitted && (
                    <Badge variant="secondary">Submitted</Badge>
                  )}
                </div>

                {/* Categories */}
                {Object.entries(ASSESSMENT_CATEGORIES).map(([categoryId, category]) => (
                  <Card key={categoryId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(category.dimensions).map(([dimensionId, dimension]) => (
                        <div key={dimensionId} className="space-y-2">
                          <p className="text-sm">{dimension}</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-muted-foreground">Weak</span>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <Button
                                  key={value}
                                  variant={ratings[dimensionId] === value ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleRatingChange(dimensionId, value)}
                                  disabled={myResponse?.is_submitted}
                                  className="w-10 h-10"
                                >
                                  {value}
                                </Button>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">Strong</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {/* Submit Button at Bottom */}
                {ratedCount === totalDimensions && !myResponse?.is_submitted && (
                  <div className="flex justify-center pt-4">
                    <Button size="lg" onClick={handleSubmit}>
                      Submit Assessment
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                {submittedResponses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No responses submitted yet. Share the link with your team!
                  </div>
                ) : (
                  <>
                    {/* Overall Score */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Team Health Score</p>
                            <p className={`text-[32px] font-semibold ${getScoreColor(currentScore)}`}>
                              {currentScore}%
                            </p>
                          </div>
                          <Badge {...getScoreBadge(currentScore)}>{getScoreBadge(currentScore).label}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Respondents */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Respondents ({submittedResponses.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {submittedResponses.map((r) => (
                            <Badge key={r.id} variant="secondary">
                              {r.profile?.full_name || 'Unknown'}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <HeartPulse className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-[16px] font-semibold text-foreground mb-1">No Active Assessment</h3>
            <p className="text-[13px] text-muted-foreground">
              {hasDirectorAccess 
                ? "Start a new health assessment to collect feedback from your team."
                : "Wait for a director to start a new health assessment."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historical Results */}
      {completedAssessments.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-[16px] font-medium text-foreground">Historical Results</h2>

          {/* Trend Chart */}
          {chartData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Health Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                      <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--primary)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Assessments */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedAssessments.map((assessment, index) => {
              const prevScore = completedAssessments[index + 1]?.overall_score ?? null;
              const badge = getScoreBadge(assessment.overall_score || 0);
              
              return (
                <Card key={assessment.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{assessment.title}</CardTitle>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <CardDescription>
                      {format(new Date(assessment.assessment_date), 'MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-semibold ${getScoreColor(assessment.overall_score || 0)}`}>
                          {assessment.overall_score}%
                        </span>
                        {getTrendIcon(assessment.overall_score || 0, prevScore)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {assessment.respondent_count} responses
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Health;
