import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  author: string;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  content: string;
  cover_image_url?: string | null;
  published?: boolean;
  author?: string;
  meta_description?: string | null;
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  id: string;
}

export const useBlogPosts = (options?: { publishedOnly?: boolean }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (options?.publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPosts(data || []);
      setError(null);
    } catch (err: any) {
      logger.error('Error fetching blog posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPostBySlug = useCallback(async (slug: string): Promise<BlogPost | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }
      return data;
    } catch (err: any) {
      logger.error('Error fetching blog post:', err);
      return null;
    }
  }, []);

  const createPost = async (input: CreateBlogPostInput): Promise<BlogPost | null> => {
    try {
      const postData = {
        ...input,
        published_at: input.published ? new Date().toISOString() : null,
      };

      const { data, error: createError } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: 'Post Created',
        description: 'Blog post has been created successfully.',
      });

      await fetchPosts();
      return data;
    } catch (err: any) {
      logger.error('Error creating blog post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create blog post.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePost = async (input: UpdateBlogPostInput): Promise<BlogPost | null> => {
    try {
      const { id, ...updates } = input;
      
      // If publishing for the first time, set published_at
      if (updates.published) {
        const currentPost = posts.find(p => p.id === id);
        if (currentPost && !currentPost.published_at) {
          (updates as any).published_at = new Date().toISOString();
        }
      }

      const { data, error: updateError } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: 'Post Updated',
        description: 'Blog post has been updated successfully.',
      });

      await fetchPosts();
      return data;
    } catch (err: any) {
      logger.error('Error updating blog post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to update blog post.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Post Deleted',
        description: 'Blog post has been deleted successfully.',
      });

      await fetchPosts();
      return true;
    } catch (err: any) {
      logger.error('Error deleting blog post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete blog post.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const uploadCoverImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      logger.error('Error uploading cover image:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upload cover image.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  useEffect(() => {
    fetchPosts();
  }, [options?.publishedOnly]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    getPostBySlug,
    createPost,
    updatePost,
    deletePost,
    uploadCoverImage,
    generateSlug,
  };
};
