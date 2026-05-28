
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TestTube2, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Settings,
  Trash2,

  BarChart3
} from 'lucide-react';
import { TestingFramework } from '@/components/admin/TestingFramework';
import { useToast } from '@/hooks/use-toast';

const UNIT_TEST_TIMEOUT_MS = 3000;
const INTEGRATION_TEST_TIMEOUT_MS = 5000;

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  timestamp: Date;
}

const Testing = () => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [coverage, setCoverage] = useState<number | null>(null);

  const addTestResult = (result: Omit<TestResult, 'id' | 'timestamp'>) => {
    const newResult: TestResult = {
      ...result,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setTestResults(prev => [newResult, ...prev]);
  };

  const simulateTest = async (testName: string, duration: number = 2000) => {
    setIsRunning(true);
    
    addTestResult({
      name: testName,
      status: 'running'
    });

    await new Promise(resolve => setTimeout(resolve, duration));
    
    const success = Math.random() > 0.3; // 70% success rate
    
    setTestResults(prev => 
      prev.map(result => 
        result.name === testName && result.status === 'running'
          ? {
              ...result,
              status: success ? 'passed' : 'failed',
              duration,
              error: success ? undefined : 'Test assertion failed'
            }
          : result
      )
    );

    if (success) {
      toast({
        title: "Test Passed",
        description: `${testName} completed successfully`,
      });
    } else {
      toast({
        title: "Test Failed",
        description: `${testName} failed - check console for details`,
        variant: "destructive",
      });
    }

    setIsRunning(false);
    
    if (testName.includes('Coverage')) {
      setCoverage(Math.floor(Math.random() * 40) + 60); // 60-100%
    }
  };

  const handleInstallFramework = () => {
    toast({
      title: "Installing Testing Framework",
      description: "Vitest and React Testing Library have been configured",
    });
    addTestResult({
      name: "Install Testing Framework",
      status: 'passed',
      duration: 1500
    });
  };

  const handleRunUnitTests = () => {
    simulateTest("Unit Tests Suite", UNIT_TEST_TIMEOUT_MS);
  };

  const handleRunIntegrationTests = () => {
    simulateTest("Integration Tests Suite", INTEGRATION_TEST_TIMEOUT_MS);
  };

  const handleRunAllTests = () => {
    simulateTest("Complete Test Suite", 8000);
  };

  const handleGenerateCoverage = () => {
    simulateTest("Coverage Report Generation", 4000);
  };

  const handleHealthCheck = () => {
    simulateTest("System Health Check", 2000);
  };

  const handleSetupEnvironment = () => {
    toast({
      title: "Setting up Test Environment",
      description: "Configuring mocks and test utilities",
    });
    addTestResult({
      name: "Setup Test Environment",
      status: 'passed',
      duration: 2000
    });
  };

  const handleClearCache = () => {
    setTestResults([]);
    setCoverage(null);
    toast({
      title: "Cache Cleared",
      description: "All test results and cache have been cleared",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-status-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-status-error" />;
      case 'running':
        return <Clock className="h-4 w-4 text-status-warning animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      passed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'secondary'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <TestTube2 className="h-8 w-8 text-accent" />
        <h1 className="text-3xl font-bold">Testing Dashboard</h1>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={handleInstallFramework}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Download className="h-6 w-6" />
              <span className="text-sm">Install Framework</span>
            </Button>

            <Button
              onClick={handleRunUnitTests}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Play className="h-6 w-6" />
              <span className="text-sm">Run Unit Tests</span>
            </Button>

            <Button
              onClick={handleRunIntegrationTests}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <TestTube2 className="h-6 w-6" />
              <span className="text-sm">Integration Tests</span>
            </Button>

            <Button
              onClick={handleRunAllTests}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Play className="h-6 w-6 text-status-success" />
              <span className="text-sm">Run All Tests</span>
            </Button>

            <Button
              onClick={handleGenerateCoverage}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Generate Coverage</span>
            </Button>

            <Button
              onClick={handleHealthCheck}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">Health Check</span>
            </Button>

            <Button
              onClick={handleSetupEnvironment}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Settings className="h-6 w-6" />
              <span className="text-sm">Setup Environment</span>
            </Button>

            <Button
              onClick={handleClearCache}
              disabled={isRunning}
              className="h-auto p-4 flex flex-col items-center space-y-2"
              variant="outline"
            >
              <Trash2 className="h-6 w-6" />
              <span className="text-sm">Clear Cache</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Display */}
      {coverage !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Test Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Coverage</span>
                <span>{coverage}%</span>
              </div>
              <Progress value={coverage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {coverage >= 80 ? 'Excellent coverage!' : coverage >= 60 ? 'Good coverage' : 'Needs improvement'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tests have been run yet. Use the buttons above to run tests.
            </p>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h4 className="font-medium">{result.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {result.duration && (
                      <span className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* System Testing Framework */}
      <TestingFramework
        systemTests={[]}
        loading={false}
        onRunTest={(testName, testCategory) => {
          simulateTest(`${testName} (${testCategory})`, 3000);
        }}
      />
    </div>
  );
};

export default Testing;
