
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SystemTest } from '@/types/superAdmin';

interface TestingFrameworkProps {
  systemTests: SystemTest[];
  loading: boolean;
  onRunTest: (testName: string, testCategory: string) => void;
}

export const TestingFramework: React.FC<TestingFrameworkProps> = ({ 
  systemTests, 
  loading, 
  onRunTest 
}) => {
  const predefinedTests = [
    { name: 'Database Connection', category: 'database', description: 'Test database connectivity' },
    { name: 'Authentication Flow', category: 'authentication', description: 'Test user authentication' },
    { name: 'Core Features', category: 'core_features', description: 'Test main application features' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
    <div className="space-y-6">
      {/* Quick Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick System Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predefinedTests.map((test) => (
              <div key={test.name} className="p-4 border rounded-lg">
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                <Button
                  onClick={() => onRunTest(test.name, test.category)}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results History</CardTitle>
        </CardHeader>
        <CardContent>
          {systemTests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tests have been run yet. Run a test above to see results.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="flex items-center space-x-2">
                      {getStatusIcon(test.status)}
                      <span className="font-medium">{test.test_name}</span>
                    </TableCell>
                    <TableCell>{test.test_category}</TableCell>
                    <TableCell>{getStatusBadge(test.status)}</TableCell>
                    <TableCell>
                      {test.duration_ms ? `${test.duration_ms}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      {test.executed_at ? new Date(test.executed_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {test.error_message ? (
                        <span className="text-destructive text-sm">{test.error_message}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
