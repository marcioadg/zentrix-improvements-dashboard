import { supabase } from '@/integrations/supabase/client';

export interface SystemAnnouncement {
  id: string;
  message: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const announcementService = {
  // Get all announcements (for admin management)
  async getAllAnnouncements(): Promise<SystemAnnouncement[]> {
    const { data, error } = await supabase
      .from('system_announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch announcements: ${error.message}`);
    }

    return data || [];
  },

  // Get active announcement (for banner display)
  async getActiveAnnouncement(): Promise<SystemAnnouncement | null> {
    const { data, error } = await supabase
      .from('system_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Failed to fetch active announcement: ${error.message}`);
    }

    return data || null;
  },

  // Create new announcement
  async createAnnouncement(message: string): Promise<SystemAnnouncement> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // First, deactivate all existing announcements
    await supabase
      .from('system_announcements')
      .update({ is_active: false })
      .eq('is_active', true);

    // Create new announcement
    const { data, error } = await supabase
      .from('system_announcements')
      .insert({
        message,
        is_active: true,
        created_by: user.user.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create announcement: ${error.message}`);
    }

    return data;
  },

  // Update announcement
  async updateAnnouncement(id: string, message: string): Promise<SystemAnnouncement> {
    const { data, error } = await supabase
      .from('system_announcements')
      .update({ message })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update announcement: ${error.message}`);
    }

    return data;
  },

  // Activate announcement (deactivates others)
  async activateAnnouncement(id: string): Promise<SystemAnnouncement> {
    // First, deactivate all announcements
    await supabase
      .from('system_announcements')
      .update({ is_active: false })
      .eq('is_active', true);

    // Activate the selected announcement
    const { data, error } = await supabase
      .from('system_announcements')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to activate announcement: ${error.message}`);
    }

    return data;
  },

  // Deactivate announcement
  async deactivateAnnouncement(id: string): Promise<SystemAnnouncement> {
    const { data, error } = await supabase
      .from('system_announcements')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to deactivate announcement: ${error.message}`);
    }

    return data;
  },

  // Delete announcement
  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('system_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete announcement: ${error.message}`);
    }
  }
};