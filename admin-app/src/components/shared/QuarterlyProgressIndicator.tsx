import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock } from 'lucide-react';

const QuarterlyProgressIndicator = () => {
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // Determine current quarter and dates
  const getQuarterInfo = () => {
    let quarterStart: Date;
    let quarterEnd: Date;
    let quarterName: string;

    if (currentMonth >= 0 && currentMonth <= 2) {
      // Q1: Jan-Mar
      quarterStart = new Date(currentYear, 0, 1); // Jan 1
      quarterEnd = new Date(currentYear, 2, 31); // Mar 31
      quarterName = 'Q1';
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      // Q2: Apr-Jun
      quarterStart = new Date(currentYear, 3, 1); // Apr 1
      quarterEnd = new Date(currentYear, 5, 30); // Jun 30
      quarterName = 'Q2';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      // Q3: Jul-Sep
      quarterStart = new Date(currentYear, 6, 1); // Jul 1
      quarterEnd = new Date(currentYear, 8, 30); // Sep 30
      quarterName = 'Q3';
    } else {
      // Q4: Oct-Dec
      quarterStart = new Date(currentYear, 9, 1); // Oct 1
      quarterEnd = new Date(currentYear, 11, 31); // Dec 31
      quarterName = 'Q4';
    }

    return { quarterStart, quarterEnd, quarterName };
  };

  const { quarterStart, quarterEnd, quarterName } = getQuarterInfo();

  // Calculate progress
  const totalQuarterDays = Math.ceil((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Ensure progress doesn't exceed 100%
  const progressPercentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalQuarterDays) * 100)));

  return (
    <div className="flex items-center gap-3 text-[11px]">
      <div className="bg-muted text-muted-foreground rounded-[4px] px-2 py-0.5 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium">{quarterName} {currentYear}</span>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={progressPercentage} className="w-20 h-1.5" />
        <span className="text-[11px] text-muted-foreground font-medium">
          {progressPercentage}%
        </span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="text-[11px]">
          {daysRemaining} days left
        </span>
      </div>
    </div>
  );
};

export default QuarterlyProgressIndicator;