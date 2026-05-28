import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MemberWithProfile {
  id: string;
  user_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface MeetingRatingSystemProps {
  members: MemberWithProfile[];
  saveRating: (userId: string, rating: number) => Promise<{ userId: string; rating: number } | undefined>;
  getRating: (userId: string) => number | null;
  currentUserId: string | null;
  absentMembers: Set<string>;
  onAbsentToggle: (memberId: string, isAbsent: boolean) => void;
  ratingInputs: Record<string, string>;
  onRatingChange: (memberId: string, value: string) => void;
  // New: allow special permission for scriber to edit all ratings
  canEditAllRatings?: boolean;
  // New: callback to publish rating change via broadcast
  onRatingPublish?: (userId: string, rating: number) => void;
}

export const MeetingRatingSystem: React.FC<MeetingRatingSystemProps> = ({
  members,
  saveRating,
  getRating,
  currentUserId,
  absentMembers,
  onAbsentToggle,
  ratingInputs,
  onRatingChange,
  canEditAllRatings = false,
  onRatingPublish
}) => {
  const { toast } = useToast();
  const lastClickedIndexRef = useRef<number | null>(null);

  const handleRatingChange = (memberId: string, value: string) => {
    logger.log(`Rating change for member ${memberId}: ${value}`);

    // Allow users to change their own rating OR allow scriber to edit anyone
    const isSelf = memberId === currentUserId;
    const canEdit = isSelf || canEditAllRatings;
    if (!canEdit) {
      logger.log('User attempting to rate someone else without permission - blocked');
      return;
    }

    // Validate memberId is a proper UUID, not 'personal' or other invalid values
    if (!memberId || memberId === 'personal' || memberId.length !== 36) {
      logger.error('Invalid member ID for rating:', memberId);
      toast({
        title: 'Invalid Member',
        description: 'Cannot rate this member. Please refresh the page and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Normalize decimal separator: always use dot (.) instead of comma (,)
    const normalizedValue = value.replace(',', '.');

    // Allow empty string (for clearing the input)
    if (normalizedValue === '') {
      onRatingChange(memberId, '');
      return;
    }

    // Allow partial input like "1." for typing decimals
    if (normalizedValue.endsWith('.') && !isNaN(parseFloat(normalizedValue.slice(0, -1)))) {
      const baseNum = parseFloat(normalizedValue.slice(0, -1));
      if (baseNum >= 1 && baseNum <= 10) {
        onRatingChange(memberId, normalizedValue);
      }
      return;
    }

    // Parse and validate the number
    const numValue = parseFloat(normalizedValue);
    
    if (!isNaN(numValue)) {
      // Round to 1 decimal place (8.5463 → 8.5)
      const roundedValue = Math.round(numValue * 10) / 10;
      
      // Clamp to valid range 1-10 (silently auto-correct)
      if (roundedValue < 1) {
        onRatingChange(memberId, '1');
      } else if (roundedValue > 10) {
        onRatingChange(memberId, '10');
      } else {
        onRatingChange(memberId, roundedValue.toString());
      }
    }
  };

  const handleRatingSave = async (memberId: string, value: string) => {
    // Normalize decimal separator before saving
    const normalizedValue = value.replace(',', '.');
    const rating = parseFloat(normalizedValue);
    
    if (!isNaN(rating) && rating >= 1 && rating <= 10) {
      try {
        logger.log(`Saving rating ${rating} for target user ${memberId} (by ${currentUserId || 'unknown'})`);
        const result = await saveRating(memberId, rating);
        // Broadcast the rating change after successful save
        if (result && onRatingPublish) {
          onRatingPublish(result.userId, result.rating);
        }
      } catch (error) {
        logger.error('Error saving rating:', error);
        // Error handling is done in the saveRating function itself
      }
    }
  };

  const handleRatingBlur = (memberId: string, value: string) => {
    // Save when input loses focus
    handleRatingSave(memberId, value);
  };

  const handleRatingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, memberId: string, value: string) => {
    // Save when Enter is pressed
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // This will trigger onBlur which will save
      handleRatingSave(memberId, value);
    }
  };

  const handleAbsentToggle = (memberIndex: number, memberId: string, checked: boolean, event: React.MouseEvent) => {
    logger.log(`Absent toggle for member ${memberId} at index ${memberIndex}: ${checked}`);

    // Only scriber can edit absences
    if (!canEditAllRatings) {
      toast({
        title: 'Only the scriber can edit absences',
        description: 'Ask the meeting scriber to update absences.',
      });
      return;
    }

    // Check if shift key is held and we have a previous selection
    if (event.shiftKey && lastClickedIndexRef.current !== null) {
      const startIndex = Math.min(lastClickedIndexRef.current, memberIndex);
      const endIndex = Math.max(lastClickedIndexRef.current, memberIndex);

      logger.log(`Shift+click detected: selecting range from ${startIndex} to ${endIndex}`);

      // Toggle all members in the range to the same state as the clicked checkbox
      for (let i = startIndex; i <= endIndex; i++) {
        const member = members[i];
        if (member) {
          onAbsentToggle(member.user_id, checked);
        }
      }
    } else {
      // Normal single toggle
      onAbsentToggle(memberId, checked);
    }

    // Update the last clicked index
    lastClickedIndexRef.current = memberIndex;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4" />
          Meeting Ratings (1-10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border">
          <div className="col-span-7 font-medium text-sm text-muted-foreground">
            Member
          </div>
          <div className="col-span-3 font-medium text-sm text-muted-foreground text-center">
            Rating
          </div>
          <div className="col-span-2 font-medium text-sm text-muted-foreground text-center">
            Absent
          </div>
        </div>

        {/* Member rows */}
        {members.map((member, memberIndex) => {
          const inputValue = ratingInputs[member.user_id] || '';
          const isAbsent = absentMembers.has(member.user_id);
          const isCurrentUser = member.user_id === currentUserId;
          const currentRating = getRating(member.user_id);
          const isEditable = (isCurrentUser || canEditAllRatings) && !isAbsent;

          return (
            <div 
              key={member.user_id} 
              className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${
                isAbsent ? 'bg-muted opacity-60' : 'bg-muted/50'
              }`}
            >
              {/* Member name */}
              <div className="col-span-7">
                <div className="font-medium text-sm text-foreground">
                  {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                  {isCurrentUser && (
                    <span className="text-primary ml-1">(You)</span>
                  )}
                  {isAbsent && (
                    <span className="text-muted-foreground ml-1">(Absent)</span>
                  )}
                </div>
              </div>
              
              {/* Rating input/display */}
              <div className="col-span-3">
                {isEditable ? (
                  // Editable input for self or scriber editing others
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            step="0.1"
                            lang="en"
                            inputMode="decimal"
                            value={inputValue}
                            onChange={(e) => handleRatingChange(member.user_id, e.target.value)}
                            onBlur={(e) => handleRatingBlur(member.user_id, e.target.value)}
                            onKeyDown={(e) => handleRatingKeyDown(e, member.user_id, inputValue)}
                            disabled={isAbsent}
                            className={`w-full h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isAbsent ? 'bg-muted cursor-not-allowed' : ''
                            }`}
                            placeholder={currentRating ? String(currentRating) : '1-10'}
                          />
                ) : (
                  // Read-only display for other members' ratings
                  <div className={`w-full h-8 flex items-center justify-center border rounded text-sm ${
                    isAbsent ? 'bg-muted' : 'bg-background border-border'
                  }`}>
                    <span className="text-muted-foreground">
                      {currentRating || '-'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Absent checkbox */}
              <div className="col-span-2 flex justify-center">
                <div
                  onClick={(e) => handleAbsentToggle(memberIndex, member.user_id, !isAbsent, e)}
                  className={canEditAllRatings ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                >
                  <Checkbox
                    checked={isAbsent}
                    className="h-4 w-4"
                    disabled={!canEditAllRatings}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
