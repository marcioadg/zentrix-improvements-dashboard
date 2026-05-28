import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';

interface ChecklistItem {
  id: string;
  text: string;
}

interface ChecklistProps {
  items: ChecklistItem[];
  lessonSlug: string;
}

export const Checklist: React.FC<ChecklistProps> = ({ items, lessonSlug }) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const { completeLesson, getLessonProgress } = useTrainingProgress();
  const lessonProgress = getLessonProgress(lessonSlug);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`checklist-${lessonSlug}`);
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch {
        localStorage.removeItem(`checklist-${lessonSlug}`);
      }
    }
  }, [lessonSlug]);

  // Save to localStorage when items change
  useEffect(() => {
    localStorage.setItem(`checklist-${lessonSlug}`, JSON.stringify(Array.from(checkedItems)));
  }, [checkedItems, lessonSlug]);

  const handleToggle = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const allChecked = items.every(item => checkedItems.has(item.id));
  const isCompleted = lessonProgress?.status === 'completed';

  const handleComplete = () => {
    if (allChecked) {
      completeLesson({ lessonSlug, pathSlug: lessonProgress?.path_slug || '' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-md p-2 -m-2 transition-colors hover:bg-muted/50">
              <Checkbox
                id={item.id}
                checked={checkedItems.has(item.id)}
                onCheckedChange={() => handleToggle(item.id)}
                className="mt-1"
              />
              <label
                htmlFor={item.id}
                className="text-body leading-relaxed cursor-pointer select-none flex-grow"
              >
                {item.text}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <span className="font-medium">{checkedItems.size}</span> 
          <span>of</span> 
          <span className="font-medium">{items.length}</span> 
          <span>completed</span>
        </div>
        {allChecked && !isCompleted && (
          <Button onClick={handleComplete} size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-body-sm font-medium">Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};