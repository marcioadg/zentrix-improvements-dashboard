
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles } from 'lucide-react';
import { getExamplePlaybook } from './ExamplePlaybooks';

interface CreateExamplePlaybookButtonProps {
  onCreateExample: (exampleData: any) => void;
}

export const CreateExamplePlaybookButton: React.FC<CreateExamplePlaybookButtonProps> = ({
  onCreateExample
}) => {
  const handleCreateExample = () => {
    const exampleData = getExamplePlaybook('newEmployeeOnboarding');
    onCreateExample(exampleData);
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleCreateExample}
      className="flex items-center gap-2"
    >
      <Sparkles className="h-4 w-4" />
      <BookOpen className="h-4 w-4" />
      Create Example: New Employee Onboarding
    </Button>
  );
};
