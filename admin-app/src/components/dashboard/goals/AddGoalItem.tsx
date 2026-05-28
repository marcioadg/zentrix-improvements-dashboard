
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getEndOfCurrentQuarter, formatDateForInput } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface AddGoalItemProps {
  onAddGoal: (title: string, ownerId?: string, targetDate?: string) => Promise<boolean> | Promise<void> | void;
  defaultOwnerId?: string;
  teamId?: string;
}

export const AddGoalItem: React.FC<AddGoalItemProps> = ({
  onAddGoal,
  defaultOwnerId,
  teamId
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      // Use provided defaultOwnerId, fallback to current user
      const ownerId = defaultOwnerId || user?.id;
      
      logger.log('🎯 AddGoalItem: Attempting to add goal:', {
        title: title.trim(),
        ownerId,
        defaultOwnerId,
        userId: user?.id,
        teamId
      });
      
      try {
        // Set default target date to end of current quarter
        const targetDate = getEndOfCurrentQuarter();
        logger.log('🎯 AddGoalItem: Using targetDate:', targetDate);
        const result = await onAddGoal(title.trim(), ownerId, targetDate);
        logger.log('🎯 AddGoalItem: Goal creation result:', result);
        
        // Only clear input if result is explicitly true (for functions returning boolean)
        // or if onAddGoal doesn't return anything (void functions)
        if (result !== false) {
          setTitle(''); // Clear the input on success or void return
          logger.log('✅ AddGoalItem: Goal added successfully');
        } else {
          logger.error('❌ AddGoalItem: Goal creation returned false');
        }
      } catch (error) {
        logger.error('❌ AddGoalItem: Error during goal creation:', error);
      }
    }
  };

  return (
    <div className="border border-dashed border-border/30 rounded-[6px] py-3 px-4 hover:border-border/50 transition-colors">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ Add Goal"
        className="border-0 p-0 h-fit bg-transparent text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
};
