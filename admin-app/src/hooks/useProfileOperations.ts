import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useProfileOperations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload an avatar",
        variant: "destructive"
      });
      return null;
    }

    logger.log('🔧 Avatar upload started:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      userId: user.id 
    });
    setUploading(true);

    try {
      logger.log('🔍 Step 1: Validating file...');
      // Validate file
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        throw new Error('File size must be less than 3MB');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      logger.log('✅ Step 1 complete: File validation passed');

      logger.log('🔍 Step 2: Creating filename...');
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      logger.log('✅ Step 2 complete: Filename created:', fileName);

      logger.log('🔍 Step 3: Uploading to Supabase storage...');
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        logger.error('❌ Step 3 failed: Storage upload error:', uploadError);
        throw uploadError;
      }
      logger.log('✅ Step 3 complete: File uploaded to storage');

      logger.log('🔍 Step 4: Getting public URL...');
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      logger.log('✅ Step 4 complete: Public URL obtained:', publicUrl);

      logger.log('🔍 Step 5: Updating profile in database...');
      // Update profile with new avatar URL — write to both columns so all apps sync immediately
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, profile_image_url: publicUrl } as any)
        .eq('id', user.id);

      if (updateError) {
        logger.error('❌ Step 5 failed: Profile update error:', updateError);
        throw updateError;
      }
      logger.log('✅ Step 5 complete: Profile updated in database');

      logger.log('🔍 Step 6: Invalidating cache...');
      // Invalidate profile caches to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      logger.log('✅ Step 6 complete: Cache invalidated');

      logger.log('🎉 Upload process completed successfully!');
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      return publicUrl;
    } catch (error) {
      logger.error('💥 Upload process failed at some step:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Update profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate profile caches to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });

      toast({
        title: "Success",
        description: "Profile picture removed successfully",
      });

      return true;
    } catch (error) {
      logger.error('Error removing avatar:', error);
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate profile caches to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });

      // Track profile update in analytics
      import('@/lib/analytics').then(({ trackProfileUpdated }) => {
        trackProfileUpdated();
      });

      // Track profile update with new event
      const fieldsUpdated = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
      import('@/lib/statsigAnalytics').then(({ trackUserProfileUpdated }) => {
        trackUserProfileUpdated({
          user_id: user.id,
          fields_updated: fieldsUpdated,
        });
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      return true;
    } catch (error) {
      logger.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    updateProfile,
    uploading
  };
};