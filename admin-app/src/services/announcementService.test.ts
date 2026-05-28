import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { announcementService } from './announcementService';

function mockFrom(chainResult: any) {
  vi.mocked(supabase.from).mockReturnValue(chainResult as any);
}

describe('announcementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAnnouncements', () => {
    it('returns announcements on success', async () => {
      const announcements = [{ id: '1', message: 'Hello', is_active: true }];
      mockFrom({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: announcements, error: null }),
        }),
      });
      const result = await announcementService.getAllAnnouncements();
      expect(result).toEqual(announcements);
    });

    it('returns empty array when data is null', async () => {
      mockFrom({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      const result = await announcementService.getAllAnnouncements();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockFrom({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
        }),
      });
      await expect(announcementService.getAllAnnouncements()).rejects.toThrow('Failed to fetch announcements');
    });
  });

  describe('getActiveAnnouncement', () => {
    it('returns active announcement', async () => {
      const announcement = { id: '1', message: 'Active', is_active: true };
      mockFrom({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: announcement, error: null }),
              }),
            }),
          }),
        }),
      });
      const result = await announcementService.getActiveAnnouncement();
      expect(result).toEqual(announcement);
    });

    it('returns null when no rows (PGRST116)', async () => {
      mockFrom({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        }),
      });
      const result = await announcementService.getActiveAnnouncement();
      expect(result).toBeNull();
    });

    it('throws on non-PGRST116 error', async () => {
      mockFrom({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: '500', message: 'server error' } }),
              }),
            }),
          }),
        }),
      });
      await expect(announcementService.getActiveAnnouncement()).rejects.toThrow('Failed to fetch active announcement');
    });
  });

  describe('createAnnouncement', () => {
    it('throws when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);
      await expect(announcementService.createAnnouncement('test')).rejects.toThrow('User not authenticated');
    });

    it('creates announcement successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      } as any);
      const created = { id: '1', message: 'test', is_active: true };
      mockFrom({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: created, error: null }),
          }),
        }),
      });
      // First call deactivates, second call creates - both use supabase.from
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: created, error: null }),
            }),
          }),
        } as any;
      });
      const result = await announcementService.createAnnouncement('test');
      expect(result).toEqual(created);
    });
  });

  describe('deleteAnnouncement', () => {
    it('succeeds without error', async () => {
      mockFrom({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      await expect(announcementService.deleteAnnouncement('1')).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      mockFrom({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
        }),
      });
      await expect(announcementService.deleteAnnouncement('1')).rejects.toThrow('Failed to delete announcement');
    });
  });

  describe('deactivateAnnouncement', () => {
    it('returns data on success', async () => {
      const deactivated = { id: '1', is_active: false };
      mockFrom({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: deactivated, error: null }),
            }),
          }),
        }),
      });
      const result = await announcementService.deactivateAnnouncement('1');
      expect(result.is_active).toBe(false);
    });
  });
});
