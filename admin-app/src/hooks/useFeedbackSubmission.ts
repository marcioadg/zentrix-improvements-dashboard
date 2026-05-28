
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export const useFeedbackSubmission = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `feedback/${fileName}`;

      const { error } = await supabase.storage
        .from('feedback-images')
        .upload(filePath, file);

      if (error) {
        logger.error('Error uploading image:', error);
        return null;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('feedback-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      logger.error('Error uploading image:', error);
      return null;
    }
  };

  const submitFeedback = async (
    title: string,
    description: string,
    image?: File | null
  ) => {
    setLoading(true);
    try {
      let finalDescription = description;
      let imageUrl: string | null = null;
      
      // Upload image if provided
      if (image) {
        imageUrl = await uploadImage(image);
        if (!imageUrl) {
          toast({
            title: "Warning",
            description: "Failed to upload image, but feedback will still be submitted.",
            variant: "destructive",
          });
        }
      }

      // Insert into fast_tasks table with image URL
      const { error } = await supabase
        .from('fast_tasks')
        .insert({
          title: `[USER FEEDBACK] ${title}`,
          description: finalDescription,
          status: 'todo',
          task_type: 'product',
          source: 'feedback-widget',
          user_id: null, // Anonymous submission
          order_position: 0,
          image_url: imageUrl,
        });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It has been added to our task board.",
      });

      return true;
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitFeedback,
    loading,
  };
};
