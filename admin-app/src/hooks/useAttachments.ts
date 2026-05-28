
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  entity_type: 'task' | 'issue';
  entity_id: string;
  created_at: string;
  updated_at: string;
}

export const useAttachments = (entityType: 'task' | 'issue', entityId: string) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  logger.log('🔍 useAttachments: Hook initialized', { entityType, entityId, typeOfEntityId: typeof entityId });

  const fetchAttachments = useCallback(async () => {
    if (!entityId) {
      logger.log('🔍 useAttachments: No entityId provided, skipping fetch');
      return;
    }
    
    logger.log('🔍 useAttachments: Starting fetch', { entityType, entityId });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('🔍 useAttachments: Database error:', error);
        throw error;
      }
      
      logger.log('🔍 useAttachments: Fetch successful', { count: data?.length || 0 });
      setAttachments(data || []);
    } catch (error) {
      logger.error('🔍 useAttachments: Error fetching attachments:', error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, toast]);

  const uploadFile = useCallback(async (file: File): Promise<Attachment | null> => {
    if (!entityId) return null;

    setUploading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to upload attachments');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${entityType}/${entityId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error: dbError } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: filePath,
          entity_type: entityType,
          entity_id: entityId,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newAttachment = data as Attachment;
      setAttachments(prev => [newAttachment, ...prev]);
      
      // Track file upload in analytics
      import('@/lib/analytics').then(({ trackAttachmentUploaded }) => {
        const entityTypeMap: Record<string, 'task' | 'goal' | 'issue'> = {
          'task': 'task',
          'goal': 'goal',
          'issue': 'issue'
        };
        trackAttachmentUploaded(entityTypeMap[entityType] || 'task');
      });
      
      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
      });

      return newAttachment;
    } catch (error) {
      logger.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [entityId, entityType, toast]);

  const deleteAttachment = useCallback(async (attachment: Attachment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      
      toast({
        title: "Success",
        description: `${attachment.file_name} deleted successfully`,
      });
    } catch (error) {
      logger.error('Error deleting attachment:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${attachment.file_name}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const getDownloadUrl = useCallback(async (attachment: Attachment): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.storage_path, 3600, {
          download: true // Force download instead of viewing
        });

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      logger.error('Error getting download URL:', error);
      toast({
        title: "Error",
        description: "Failed to generate download link",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const getViewUrl = useCallback(async (attachment: Attachment): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      logger.error('Error getting view URL:', error);
      toast({
        title: "Error",
        description: "Failed to generate view link",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  return {
    attachments,
    loading,
    uploading,
    fetchAttachments,
    uploadFile,
    deleteAttachment,
    getDownloadUrl,
    getViewUrl,
  };
};
