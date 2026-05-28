
import { useMemo } from 'react';
import { logger } from '@/lib/logger';

interface MeetingWithTeam {
  id: string;
  team_id: string;
  team_name: string;
  company_name: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  average_rating?: number;
  total_duration_seconds?: number;
}

interface RawMeetingData {
  id: string;
  team_id: string;
  meeting_type: string;
  current_section: number;
  started_at: string;
  ended_at: string | null;
  scriber_id: string | null;
  status: string;
  section_durations?: Record<number, number>;
  meeting_results?: {
    meeting_ratings?: any;
    total_duration_seconds?: number;
  } | {
    meeting_ratings?: any;
    total_duration_seconds?: number;
  }[];
}

export const useMeetingDataProcessor = () => {
  const processRatings = (meetingRatings: any): number | undefined => {
    if (!meetingRatings) return undefined;

    try {
      let ratingsObject: Record<string, any> = {};
      
      if (typeof meetingRatings === 'string') {
        ratingsObject = JSON.parse(meetingRatings);
      } else if (typeof meetingRatings === 'object' && meetingRatings !== null) {
        ratingsObject = meetingRatings as Record<string, any>;
      }
      
      // Check if ratings object has any meaningful data before logging
      const hasData = Object.keys(ratingsObject).length > 0 && 
                     Object.values(ratingsObject).some(value => 
                       (typeof value === 'number' && !isNaN(value) && value > 0) ||
                       (typeof value === 'string' && !isNaN(parseFloat(value)) && parseFloat(value) > 0)
                     );
      
      if (hasData) {
        logger.debug('🔍 useMeetingDataProcessor: Processing ratings with data:', {
          meetingRatings,
          type: typeof meetingRatings
        });
        logger.debug('🔍 useMeetingDataProcessor: Parsed ratings object:', ratingsObject);
      }
      
      const ratings: number[] = [];
      Object.values(ratingsObject).forEach(value => {
        let numericValue: number | undefined;
        
        if (typeof value === 'number' && !isNaN(value) && value > 0) {
          numericValue = value;
        } else if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (!isNaN(parsed) && parsed > 0) {
            numericValue = parsed;
          }
        }
        
        if (numericValue !== undefined) {
          ratings.push(numericValue);
        }
      });
      
      if (hasData) {
        logger.debug('🔍 useMeetingDataProcessor: Extracted ratings:', ratings);
      }
      
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        logger.debug('✅ useMeetingDataProcessor: Calculated average:', average);
        return average;
      }
    } catch (error) {
      logger.error('🚨 useMeetingDataProcessor: Error parsing meeting ratings:', error);
    }
    
    return undefined;
  };

  const processMeetingsData = (
    meetingsData: RawMeetingData[],
    companyTeams: Array<{ id: string; name: string; company_name: string }>
  ): MeetingWithTeam[] => {
    return meetingsData.map(meeting => {
      const team = companyTeams.find(t => t.id === meeting.team_id);
      
      let averageRating: number | undefined;
      let totalDurationSeconds: number | undefined;
      
      // Handle meeting_results - could be array or single object
      let meetingResults;
      if (meeting.meeting_results) {
        if (Array.isArray(meeting.meeting_results)) {
          meetingResults = meeting.meeting_results[0];
        } else {
          meetingResults = meeting.meeting_results;
        }
        
        if (meetingResults) {
          totalDurationSeconds = meetingResults.total_duration_seconds;
          
          // Only log when there are meaningful ratings to process
          const hasRatings = meetingResults.meeting_ratings && 
                           typeof meetingResults.meeting_ratings === 'object' &&
                           Object.keys(meetingResults.meeting_ratings).length > 0 &&
                           Object.values(meetingResults.meeting_ratings).some(value => 
                             (typeof value === 'number' && !isNaN(value) && value > 0) ||
                             (typeof value === 'string' && !isNaN(parseFloat(value)) && parseFloat(value) > 0)
                           );
          
          if (hasRatings) {
            logger.debug('🔍 useMeetingDataProcessor: Processing meeting ratings for meeting:', meeting.id, {
              meetingRatings: meetingResults.meeting_ratings,
              meetingRatingsType: typeof meetingResults.meeting_ratings
            });
          }
          
          averageRating = processRatings(meetingResults.meeting_ratings);
          if (averageRating) {
            logger.debug('🔍 useMeetingDataProcessor: Calculated average rating:', averageRating);
          }
        }
      }
      
      return {
        id: meeting.id,
        team_id: meeting.team_id,
        team_name: team?.name || 'Unknown Team',
        company_name: team?.company_name || 'Unknown Company',
        meeting_type: meeting.meeting_type || 'weekly',
        current_section: meeting.current_section || 0,
        started_at: meeting.started_at,
        ended_at: meeting.ended_at,
        scriber_id: meeting.scriber_id,
        status: meeting.status,
        average_rating: averageRating,
        total_duration_seconds: totalDurationSeconds
      };
    });
  };

  return {
    processMeetingsData,
    processRatings
  };
};
