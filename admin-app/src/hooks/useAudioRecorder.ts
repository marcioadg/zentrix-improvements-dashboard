import { useState, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      logger.log('🎤 [useAudioRecorder] startRecording called');
      setError(null);
      
      // Request microphone access
      logger.log('🎤 [useAudioRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      logger.log('✅ [useAudioRecorder] Microphone access granted');

      // Create MediaRecorder with WebM format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      logger.log('🎤 [useAudioRecorder] Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          logger.log('📦 [useAudioRecorder] Audio chunk received, size:', event.data.size);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      logger.log('✅ [useAudioRecorder] Recording started successfully with format:', mimeType);
    } catch (err) {
      logger.error('❌ [useAudioRecorder] Error starting recording:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone access denied. Please allow microphone access in your browser.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError('Failed to start recording: ' + err.message);
        }
      } else {
        setError('Failed to start recording. Please try again.');
      }
      
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    logger.log('🛑 [useAudioRecorder] stopRecording called');
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        logger.log('⚠️ [useAudioRecorder] No active recording to stop');
        setIsRecording(false);
        resolve(null);
        return;
      }

      logger.log('🛑 [useAudioRecorder] MediaRecorder state:', mediaRecorder.state);
      logger.log('🛑 [useAudioRecorder] Audio chunks collected:', audioChunksRef.current.length);

      mediaRecorder.onstop = async () => {
        logger.log('✅ [useAudioRecorder] MediaRecorder stopped');
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => {
          logger.log('🛑 [useAudioRecorder] Stopping track:', track.kind);
          track.stop();
        });

        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        logger.log('📦 [useAudioRecorder] Audio blob created, size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          logger.error('❌ [useAudioRecorder] Audio blob is empty!');
          setError('No audio data recorded');
          setIsRecording(false);
          resolve(null);
          return;
        }

        // Convert to base64
        logger.log('🔄 [useAudioRecorder] Converting to base64...');
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          logger.log('✅ [useAudioRecorder] Audio converted to base64, length:', base64Audio.length);
          setIsRecording(false);
          resolve(base64Audio);
        };
        reader.onerror = () => {
          logger.error('❌ [useAudioRecorder] Failed to convert audio to base64');
          setError('Failed to process audio recording');
          setIsRecording(false);
          resolve(null);
        };
        reader.readAsDataURL(audioBlob);
      };

      logger.log('🛑 [useAudioRecorder] Calling mediaRecorder.stop()...');
      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
  };
};
