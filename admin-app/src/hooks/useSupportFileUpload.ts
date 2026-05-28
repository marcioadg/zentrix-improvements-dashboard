import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

export const useSupportFileUpload = () => {
  const { toast } = useToast();
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return false;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Please upload an image, PDF, or document', variant: 'destructive' });
      return false;
    }
    return true;
  }, [toast]);

  const selectFile = useCallback((file: File) => {
    if (!validateFile(file)) return;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl });
  }, [validateFile]);

  const clearFile = useCallback(() => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  }, [pendingFile]);

  const uploadFile = useCallback(async (userId: string): Promise<{ url: string; name: string; type: string } | null> => {
    if (!pendingFile) return null;
    setUploading(true);
    try {
      const ext = pendingFile.file.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('support-attachments').upload(path, pendingFile.file);
      if (error) throw error;
      const { data } = supabase.storage.from('support-attachments').getPublicUrl(path);
      clearFile();
      return { url: data.publicUrl, name: pendingFile.file.name, type: pendingFile.file.type };
    } catch (err) {
      logger.error('Upload failed:', err);
      toast({ title: 'Upload failed', description: 'Could not upload file', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [pendingFile, clearFile, toast]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          selectFile(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
          return;
        }
      }
    }
  }, [selectFile]);

  return { pendingFile, uploading, selectFile, clearFile, uploadFile, handlePaste };
};
