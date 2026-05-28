import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useFastTasks } from '@/hooks/useFastTasks';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
export const TasksCompanyValidationDebugger = () => {
  const {
    profile
  } = useProfile();
  const {
    currentCompany,
    companies
  } = useMultiCompany();
  const {
    tasks,
    loading,
    error
  } = useFastTasks();
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  return <Card className="mb-4 border-yellow-200 bg-warning/5">
      
      
    </Card>;
};