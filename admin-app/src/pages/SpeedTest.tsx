import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface PageTest {
  name: string;
  route: string;
  status: 'pending' | 'testing' | 'completed' | 'error';
  loadTime?: number;
  error?: string;
}

interface TestRun {
  id: string;
  test_run_id: string;
  test_timestamp: string;
  averageTime: number;
  totalPages: number;
  completedPages: number;
}

interface SpeedTestResult {
  id: string;
  page_name: string;
  page_route: string;
  load_time_ms: number | null;
  test_run_id: string;
  user_id: string;
  status: string;
  error_message: string | null;
  test_timestamp: string;
}

const PAGES_TO_TEST: Omit<PageTest, 'status'>[] = [
  { name: 'Dashboard', route: '/' },
  { name: 'Login', route: '/login' },
  { name: 'Sign Up', route: '/signup' },
  { name: 'Forgot Password', route: '/forgot-password' },
  { name: 'Metrics', route: '/metrics' },
  { name: 'People', route: '/people' },
  { name: 'Tasks', route: '/tasks' },
  { name: 'Goals', route: '/goals' },
  { name: 'Issues', route: '/issues' },
  { name: 'Meetings', route: '/meetings' },
  { name: 'Strategy', route: '/strategy' },
  { name: 'Org Chart', route: '/org-chart' },
  { name: 'Tools', route: '/tools' },
  { name: 'Process', route: '/process' },
];

export default function SpeedTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<PageTest[]>(
    PAGES_TO_TEST.map(page => ({ ...page, status: 'pending' }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    loadRecentRuns();
  }, [user]);

  const loadRecentRuns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('speed_test_runs')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const runs: TestRun[] = data.map(run => ({
        id: run.id,
        test_run_id: run.id,
        test_timestamp: run.started_at,
        averageTime: run.average_load_time_ms,
        totalPages: run.total_pages,
        completedPages: run.completed_pages,
      }));

      setRecentRuns(runs);
    } catch (error) {
      logger.error('Error loading recent runs:', error);
    }
  };

  const testPageSpeed = async (page: Pick<PageTest, 'name' | 'route'>): Promise<number> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1024px';
      iframe.style.height = '768px';
      
      const startTime = performance.now();
      let hasLoaded = false;
      
      // Timeout handler
      const timeout = setTimeout(() => {
        if (!hasLoaded) {
          hasLoaded = true;
          document.body.removeChild(iframe);
          reject(new Error('Page load timeout'));
        }
      }, 30000); // 30 second timeout
      
      iframe.onload = () => {
        if (hasLoaded) return;
        hasLoaded = true;
        
        clearTimeout(timeout);
        const loadTime = Math.round(performance.now() - startTime);
        
        // Clean up
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {
            // Iframe already removed
          }
        }, 100);
        
        resolve(loadTime);
      };
      
      iframe.onerror = () => {
        if (hasLoaded) return;
        hasLoaded = true;
        
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        reject(new Error('Page load error'));
      };
      
      // Build the full URL
      const baseUrl = window.location.origin;
      const testUrl = `${baseUrl}${page.route}`;
      
      // Add cache-busting parameter
      const cacheBuster = Date.now();
      const separator = page.route.includes('?') ? '&' : '?';
      iframe.src = `${testUrl}${separator}_t=${cacheBuster}`;
      
      document.body.appendChild(iframe);
    });
  };

  const saveTestResult = async (page: Pick<PageTest, 'name' | 'route'>, loadTime: number, testRunId: string, status: string, errorMessage?: string) => {
    if (!user) return;

    try {
      await supabase.from('page_speed_tests').insert({
        page_name: page.name,
        page_route: page.route,
        load_time_ms: loadTime,
        test_run_id: testRunId,
        user_id: user.id,
        status,
        error_message: errorMessage,
        test_timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error saving test result:', error);
    }
  };

  const createTestRun = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('speed_test_runs').insert({
      total_pages: PAGES_TO_TEST.length,
      completed_pages: 0,
      average_load_time_ms: 0,
      test_duration_ms: 0,
      user_id: user.id,
      started_at: new Date().toISOString(),
    }).select('id').single();

    if (error) throw error;
    return data.id;
  };

  const updateTestRun = async (testRunId: string, completedPages: number, averageTime: number, testDuration: number, fastestRoute?: string, slowestRoute?: string) => {
    await supabase.from('speed_test_runs').update({
      completed_pages: completedPages,
      average_load_time_ms: averageTime,
      test_duration_ms: testDuration,
      fastest_page_route: fastestRoute,
      slowest_page_route: slowestRoute,
      completed_at: new Date().toISOString(),
    }).eq('id', testRunId);
  };

  const startTest = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run speed tests",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setCurrentProgress(0);
    const testStartTime = performance.now();

    try {
      // Create test run record first
      const testRunId = await createTestRun();

      // Reset all pages to pending
      setPages(PAGES_TO_TEST.map(page => ({ ...page, status: 'pending' })));

      const loadTimes: number[] = [];
      let fastestRoute = '';
      let slowestRoute = '';
      let fastestTime = Infinity;
      let slowestTime = 0;

      for (let i = 0; i < PAGES_TO_TEST.length; i++) {
        const page = PAGES_TO_TEST[i];
        
        // Update status to testing
        setPages(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'testing' } : p
        ));

        try {
          const loadTime = await testPageSpeed(page);
          loadTimes.push(loadTime);
          
          // Track fastest and slowest
          if (loadTime < fastestTime) {
            fastestTime = loadTime;
            fastestRoute = page.route;
          }
          if (loadTime > slowestTime) {
            slowestTime = loadTime;
            slowestRoute = page.route;
          }
          
          // Update status to completed
          setPages(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'completed', loadTime } : p
          ));

          await saveTestResult(page, loadTime, testRunId, 'success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Update status to error
          setPages(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error', error: errorMessage } : p
          ));

          await saveTestResult(page, 0, testRunId, 'error', errorMessage);
        }

        setCurrentProgress(((i + 1) / PAGES_TO_TEST.length) * 100);
      }

      // Calculate final stats and update test run
      const testEndTime = performance.now();
      const testDuration = Math.round(testEndTime - testStartTime);
      const averageTime = loadTimes.length > 0 ? Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length) : 0;
      const completedPages = loadTimes.length;

      await updateTestRun(testRunId, completedPages, averageTime, testDuration, fastestRoute, slowestRoute);

      setIsRunning(false);
      await loadRecentRuns();
      
      toast({
        title: "Speed Test Completed",
        description: `Tested ${completedPages} pages with ${averageTime}ms average load time`,
      });
    } catch (error) {
      setIsRunning(false);
      logger.error('Test run failed:', error);
      toast({
        title: "Test Failed",
        description: "Failed to create test run",
        variant: "destructive",
      });
    }
  };

  const getPerformanceLevel = (loadTime: number) => {
    if (loadTime <= 500) return 'good';     // Green - Fast
    if (loadTime <= 1000) return 'moderate'; // Yellow - Moderate  
    return 'poor';                           // Red - Slow
  };

  const getStatusBadge = (page: PageTest) => {
    switch (page.status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'testing':
        return <Badge variant="default">Testing...</Badge>;
      case 'completed':
        const performance = getPerformanceLevel(page.loadTime || 0);
        const performanceColors = {
          good: 'bg-success text-success-foreground hover:bg-success/90',
          moderate: 'bg-warning text-warning-foreground hover:bg-warning/90',
          poor: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        };
        return (
          <Badge 
            variant="secondary" 
            className={performanceColors[performance]}
          >
            {page.loadTime}ms
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const completedPages = pages.filter(p => p.status === 'completed');
  const currentAverage = completedPages.length > 0 
    ? Math.round(completedPages.reduce((sum, p) => sum + (p.loadTime || 0), 0) / completedPages.length)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Speed Test</h1>
        <p className="text-lg text-muted-foreground">
          Test the load speed of all pages and track performance over time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Control */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Test Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={startTest} 
                disabled={isRunning}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Start Test'
                )}
              </Button>
              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(currentProgress)}%</span>
                  </div>
                  <Progress value={currentProgress} />
                </div>
              )}
              {completedPages.length > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentAverage}ms</div>
                  <div className="text-sm text-muted-foreground">Average Load Time</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Runs */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRuns.length > 0 ? (
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{run.averageTime}ms avg</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(run.test_timestamp)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run.completedPages}/{run.totalPages}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No previous runs
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Page Load Times */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Page Load Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pages
                  .slice() // Create a copy to avoid mutating the original array
                  .sort((a, b) => {
                    // Sort by status first (completed results show first)
                    if (a.status === 'completed' && b.status !== 'completed') return -1;
                    if (b.status === 'completed' && a.status !== 'completed') return 1;
                    
                    // For completed tests, sort by load time (worst to best - slowest first)
                    if (a.status === 'completed' && b.status === 'completed') {
                      return (b.loadTime || 0) - (a.loadTime || 0);
                    }
                    
                    // For non-completed tests, maintain original order
                    return 0;
                  })
                  .map((page, index) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{page.name}</div>
                      <div className="text-sm text-muted-foreground">{page.route}</div>
                    </div>
                    <div>{getStatusBadge(page)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}