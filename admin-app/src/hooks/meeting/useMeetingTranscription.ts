import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';

const CHUNK_INTERVAL_MS = 15_000; // 15 seconds per chunk

export const useMeetingTranscription = (teamId: string) => {
  const { isRunning, meetingId } = useNewMeetingTimer();
  const { currentCompany } = useMultiCompany();
  const isEnabled = currentCompany?.ai_meeting_transcription === true;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentIndexRef = useRef(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store latest values in refs so callbacks don't go stale
  const meetingIdRef = useRef(meetingId);
  const companyIdRef = useRef(currentCompany?.id);
  const teamIdRef = useRef(teamId);
  
  useEffect(() => { meetingIdRef.current = meetingId; }, [meetingId]);
  useEffect(() => { companyIdRef.current = currentCompany?.id; }, [currentCompany?.id]);
  useEffect(() => { teamIdRef.current = teamId; }, [teamId]);

  const sendChunkForTranscription = useCallback(async (audioBlob: Blob, segmentIndex: number) => {
    const currentMeetingId = meetingIdRef.current;
    const currentCompanyId = companyIdRef.current;
    const currentTeamId = teamIdRef.current;

    if (!currentMeetingId || !currentCompanyId) {
      logger.warn('🎤 [Transcription] Missing meetingId or companyId, skipping chunk');
      return;
    }

    try {
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = (reader.result as string).split(',')[1];
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      if (!base64 || base64.length < 100) {
        logger.log('🎤 [Transcription] Chunk too small, skipping segment', segmentIndex);
        return;
      }

      logger.log('🎤 [Transcription] Sending chunk', segmentIndex, 'base64 length:', base64.length);

      // Call the transcribe-audio edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ audio: base64 }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        logger.error('🎤 [Transcription] Edge function error:', response.status, errData);
        return;
      }

      const { text } = await response.json();

      if (!text || text.trim().length === 0) {
        logger.log('🎤 [Transcription] Empty transcription for segment', segmentIndex);
        return;
      }

      logger.log('🎤 [Transcription] Got text for segment', segmentIndex, ':', text.substring(0, 80));

      // Store in meeting_transcripts table
      const { error: insertError } = await supabase
        .from('meeting_transcripts')
        .insert({
          meeting_id: currentMeetingId,
          company_id: currentCompanyId,
          team_id: currentTeamId,
          segment_index: segmentIndex,
          segment_text: text.trim(),
        });

      if (insertError) {
        logger.error('🎤 [Transcription] Failed to insert transcript:', insertError);
      } else {
        logger.log('🎤 [Transcription] Segment', segmentIndex, 'stored successfully');
      }
    } catch (err) {
      logger.error('🎤 [Transcription] Error processing chunk:', err);
    }
  }, []); // No deps - uses refs

  const stopAndSendChunk = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    // Request data from recorder - this triggers ondataavailable
    mediaRecorder.requestData();

    // Small delay to let ondataavailable fire, then collect and send
    setTimeout(() => {
      if (audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const currentIndex = segmentIndexRef.current;
        segmentIndexRef.current += 1;
        audioChunksRef.current = [];

        // Send async - don't block the interval
        sendChunkForTranscription(blob, currentIndex);
      }
    }, 200);
  }, [sendChunkForTranscription]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      logger.log('🎤 [Transcription] Already recording, skipping start');
      return;
    }

    try {
      logger.log('🎤 [Transcription] Requesting microphone access...');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      logger.log('✅ [Transcription] Microphone access granted');
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      segmentIndexRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      isRecordingRef.current = true;
      setIsRecording(true);

      logger.log('✅ [Transcription] Recording started, chunking every', CHUNK_INTERVAL_MS / 1000, 's');

      // Set up interval to send chunks every 15 seconds
      chunkIntervalRef.current = setInterval(() => {
        stopAndSendChunk();
      }, CHUNK_INTERVAL_MS);

    } catch (err) {
      logger.error('❌ [Transcription] Failed to start recording:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access for AI transcription.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found.');
        } else {
          setError('Failed to start recording: ' + err.message);
        }
      }
    }
  }, [stopAndSendChunk]);

  const stopRecording = useCallback(() => {
    logger.log('🛑 [Transcription] Stopping recording...');

    // Clear interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Send any remaining audio
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.requestData();
      setTimeout(() => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const currentIndex = segmentIndexRef.current;
          audioChunksRef.current = [];
          sendChunkForTranscription(blob, currentIndex);
        }
        mediaRecorder.stop();
      }, 300);
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);

    logger.log('✅ [Transcription] Recording stopped');
  }, [sendChunkForTranscription]);

  // Auto-start/stop based on meeting state — the core trigger
  useEffect(() => {
    logger.log('🎤 [Transcription] Effect check:', {
      isEnabled,
      isRunning,
      meetingId,
      companyId: currentCompany?.id,
      isCurrentlyRecording: isRecordingRef.current,
    });

    const shouldRecord = isEnabled && isRunning && !!meetingId;

    if (shouldRecord && !isRecordingRef.current) {
      logger.log('🎤 [Transcription] ✅ All conditions met — starting recording');
      startRecording();
    } else if (!shouldRecord && isRecordingRef.current) {
      logger.log('🎤 [Transcription] ⛔ Conditions no longer met — stopping recording');
      stopRecording();
    }
  }, [isEnabled, isRunning, meetingId, currentCompany?.id, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        logger.log('🎤 [Transcription] Cleanup: stopping on unmount');
        // Inline cleanup to avoid stale closure
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        isRecordingRef.current = false;
      }
    };
  }, []);

  return { isRecording, error };
};
