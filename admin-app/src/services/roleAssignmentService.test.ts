import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { RoleAssignmentService } from './roleAssignmentService';

describe('RoleAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkOrgManagementPermission', () => {
    it('returns true when RPC returns true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
      const result = await RoleAssignmentService.checkOrgManagementPermission('u1', 'c1');
      expect(result).toBe(true);
    });

    it('returns false when RPC returns false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any);
      const result = await RoleAssignmentService.checkOrgManagementPermission('u1', 'c1');
      expect(result).toBe(false);
    });

    it('returns false on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('rpc fail') } as any);
      const result = await RoleAssignmentService.checkOrgManagementPermission('u1', 'c1');
      expect(result).toBe(false);
    });

    it('returns false on exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('network'));
      const result = await RoleAssignmentService.checkOrgManagementPermission('u1', 'c1');
      expect(result).toBe(false);
    });
  });

  describe('validateUserCompanyAccess', () => {
    it('returns true when user has access', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
      const result = await RoleAssignmentService.validateUserCompanyAccess('u1', 'c1');
      expect(result).toBe(true);
    });

    it('returns false on exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('fail'));
      const result = await RoleAssignmentService.validateUserCompanyAccess('u1', 'c1');
      expect(result).toBe(false);
    });
  });

  describe('assignUserToRole', () => {
    it('returns permission denied when user has no permission', async () => {
      // checkOrgManagementPermission returns false
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any);
      const result = await RoleAssignmentService.assignUserToRole('r1', 'u2', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('returns error when target user has no access', async () => {
      let callCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: true, error: null }) as any;
        return Promise.resolve({ data: false, error: null }) as any;
      });
      const result = await RoleAssignmentService.assignUserToRole('r1', 'u2', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have access');
    });

    it('succeeds with valid permissions', async () => {
      let rpcCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(() => {
        rpcCount++;
        return Promise.resolve({ data: true, error: null }) as any;
      });
      // Mock delete (clear existing) and insert (create new)
      const mockFrom = vi.fn();
      vi.mocked(supabase.from).mockImplementation(() => {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'a1', role_id: 'r1', user_id: 'u2' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const result = await RoleAssignmentService.assignUserToRole('r1', 'u2', 'c1', 'u1');
      expect(result.success).toBe(true);
      expect(result.assignmentId).toBe('a1');
    });

    it('handles RLS permission error on insert', async () => {
      let rpcCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(() => {
        rpcCount++;
        return Promise.resolve({ data: true, error: null }) as any;
      });
      vi.mocked(supabase.from).mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42501', message: 'row-level security' },
            }),
          }),
        }),
      } as any));

      const result = await RoleAssignmentService.assignUserToRole('r1', 'u2', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('handles duplicate key error on insert', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
      vi.mocked(supabase.from).mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        }),
      } as any));

      const result = await RoleAssignmentService.assignUserToRole('r1', 'u2', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already assigned');
    });
  });

  describe('removeUserFromRole', () => {
    it('returns permission denied when no permission', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any);
      const result = await RoleAssignmentService.removeUserFromRole('r1', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('succeeds with permission', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
      const result = await RoleAssignmentService.removeUserFromRole('r1', 'c1', 'u1');
      expect(result.success).toBe(true);
    });

    it('returns error when delete fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as any);
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
        }),
      } as any);
      const result = await RoleAssignmentService.removeUserFromRole('r1', 'c1', 'u1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('delete failed');
    });
  });
});
