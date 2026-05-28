import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { featureAnnouncementService } from './featureAnnouncementService';

describe('featureAnnouncementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAnnouncements', () => {
    it('returns active announcements', async () => {
      const data = [{ id: '1', title: 'New Feature', type: 'feature' }];
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        }),
      } as any);
      const result = await featureAnnouncementService.getAllAnnouncements();
      expect(result).toEqual(data);
    });

    it('throws on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      } as any);
      await expect(featureAnnouncementService.getAllAnnouncements()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('getActiveAnnouncementsForUser', () => {
    it('returns empty when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'not auth' },
      } as any);
      const result = await featureAnnouncementService.getActiveAnnouncementsForUser();
      expect(result).toEqual([]);
    });

    it('filters announcements created after user signup', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { created_at: '2025-06-01T00:00:00Z' } },
        error: null,
      } as any);
      const data = [
        { id: '1', title: 'New', summary: 'new stuff', created_at: '2025-07-01T00:00:00Z', href: '/new', image: null, type: 'feature' },
        { id: '2', title: 'Old', summary: 'old stuff', created_at: '2025-05-01T00:00:00Z', href: null, image: null, type: 'update' },
      ];
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await featureAnnouncementService.getActiveAnnouncementsForUser();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('New');
    });

    it('limits to 5 announcements', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { created_at: '2020-01-01T00:00:00Z' } },
        error: null,
      } as any);
      const data = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        title: `Feature ${i}`,
        summary: `Summary ${i}`,
        created_at: '2025-07-01T00:00:00Z',
        href: null,
        image: null,
        type: 'feature',
      }));
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await featureAnnouncementService.getActiveAnnouncementsForUser();
      expect(result).toHaveLength(5);
    });
  });

  describe('createAnnouncement', () => {
    it('throws when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);
      await expect(
        featureAnnouncementService.createAnnouncement({ title: 'T', summary: 'S', type: 'feature' })
      ).rejects.toThrow('User not authenticated');
    });

    it('creates announcement successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);
      await expect(
        featureAnnouncementService.createAnnouncement({ title: 'T', summary: 'S', type: 'feature' })
      ).resolves.toBeUndefined();
    });
  });

  describe('deactivateAnnouncement', () => {
    it('succeeds', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
      await expect(featureAnnouncementService.deactivateAnnouncement('1')).resolves.toBeUndefined();
    });
  });

  describe('deleteAnnouncement', () => {
    it('throws on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
        }),
      } as any);
      await expect(featureAnnouncementService.deleteAnnouncement('1')).rejects.toThrow('Failed to delete');
    });
  });
});
