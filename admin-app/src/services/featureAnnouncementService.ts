import { supabase } from '@/integrations/supabase/client';
import { FeatureArticle } from '@/components/ui/feature-news';
import { logger } from '@/utils/logger';

export interface FeatureAnnouncement {
  id: string;
  title: string;
  summary: string;
  href?: string;
  image?: string;
  type: 'feature' | 'update' | 'announcement';
  is_active: boolean;
  created_by: string;
  company_id?: string;
  target_audience: 'all' | 'admins' | 'specific_company';
  created_at: string;
  updated_at: string;
}

export const featureAnnouncementService = {
  async getAllAnnouncements(): Promise<FeatureAnnouncement[]> {
    const { data, error } = await supabase
      .from('feature_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching feature announcements:', error);
      throw new Error('Failed to fetch feature announcements');
    }

    return data || [];
  },

  async getActiveAnnouncementsForUser(): Promise<FeatureArticle[]> {
    try {
      // Get current user info
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        logger.warn('Could not fetch user data for announcements:', userError);
        return []; // No announcements for unauthenticated users
      }

      const userCreatedAt = new Date(userData.user.created_at);

      // Fetch active announcements with higher limit to filter client-side
      const { data, error } = await supabase
        .from('feature_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Error fetching feature announcements:', error);
        throw new Error('Failed to fetch feature announcements');
      }

      // Filter announcements to only show ones created after user account creation
      const filteredAnnouncements = (data || []).filter(announcement => {
        const announcementCreatedAt = new Date(announcement.created_at);
        return announcementCreatedAt > userCreatedAt;
      });

      // Transform to FeatureArticle format and limit to top 5
      return filteredAnnouncements.slice(0, 5).map((announcement): FeatureArticle => ({
        href: announcement.href || `#announcement-${announcement.id}`,
        title: announcement.title,
        summary: announcement.summary,
        image: announcement.image || undefined,
        type: announcement.type,
        created_at: announcement.created_at,
      }));
    } catch (error) {
      logger.error('Error in getActiveAnnouncementsForUser:', error);
      return []; // Fail gracefully
    }
  },

  async createAnnouncement(announcement: {
    title: string;
    summary: string;
    href?: string;
    image?: string;
    type: 'feature' | 'update' | 'announcement';
    target_audience?: 'all' | 'admins' | 'specific_company';
    company_id?: string;
  }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('feature_announcements')
      .insert({
        ...announcement,
        created_by: userData.user.id,
        target_audience: announcement.target_audience || 'all',
        is_active: true,
      });

    if (error) {
      logger.error('Error creating feature announcement:', error);
      throw new Error('Failed to create feature announcement');
    }
  },

  async updateAnnouncement(id: string, updates: Partial<FeatureAnnouncement>): Promise<void> {
    const { error } = await supabase
      .from('feature_announcements')
      .update(updates)
      .eq('id', id);

    if (error) {
      logger.error('Error updating feature announcement:', error);
      throw new Error('Failed to update feature announcement');
    }
  },

  async deactivateAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('feature_announcements')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error('Error deactivating feature announcement:', error);
      throw new Error('Failed to deactivate feature announcement');
    }
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('feature_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting feature announcement:', error);
      throw new Error('Failed to delete feature announcement');
    }
  },
};