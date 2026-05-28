import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { AnalyzerService } from './analyzerService';

describe('AnalyzerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getScorePoints', () => {
    it('returns 1 for +', () => {
      expect(AnalyzerService.getScorePoints('+')).toBe(1);
    });

    it('returns 0.5 for +/-', () => {
      expect(AnalyzerService.getScorePoints('+/-')).toBe(0.5);
    });

    it('returns 0 for -', () => {
      expect(AnalyzerService.getScorePoints('-')).toBe(0);
    });

    it('returns 0 for unknown value', () => {
      expect(AnalyzerService.getScorePoints('unknown' as any)).toBe(0);
    });
  });

  describe('meetsRequirement', () => {
    it('+ meets + requirement', () => {
      expect(AnalyzerService.meetsRequirement('+', '+')).toBe(true);
    });

    it('+ meets +/- requirement', () => {
      expect(AnalyzerService.meetsRequirement('+', '+/-')).toBe(true);
    });

    it('+/- does not meet + requirement', () => {
      expect(AnalyzerService.meetsRequirement('+/-', '+')).toBe(false);
    });

    it('+/- meets +/- requirement', () => {
      expect(AnalyzerService.meetsRequirement('+/-', '+/-')).toBe(true);
    });

    it('- does not meet +/- requirement', () => {
      expect(AnalyzerService.meetsRequirement('-', '+/-')).toBe(false);
    });

    it('- meets - requirement', () => {
      expect(AnalyzerService.meetsRequirement('-', '-')).toBe(true);
    });
  });

  describe('getScores', () => {
    function mockQuery(data: any[], error: any = null) {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data, error }),
            }),
            order: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      } as any);
    }

    it('returns mapped scores', async () => {
      const raw = [{
        id: 's1',
        user_id: 'u1',
        company_id: 'c1',
        score_type: 'core_value',
        score_value: '+',
        evaluated_by: 'e1',
        created_at: '2025-01-01',
        updated_at: '2025-01-01T10:00:00Z',
        evaluation_date: '2025-01-01',
        core_value_name: 'Integrity',
      }];
      mockQuery(raw);
      const result = await AnalyzerService.getScores('c1');
      expect(result).toHaveLength(1);
      expect(result[0].score_type).toBe('core_value');
      expect(result[0].score_value).toBe('+');
    });

    it('returns empty array when no data', async () => {
      mockQuery(null as any);
      // from().select().eq().order()
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);
      const result = await AnalyzerService.getScores('c1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
          }),
        }),
      } as any);
      await expect(AnalyzerService.getScores('c1')).rejects.toThrow('db error');
    });
  });

  describe('getBars', () => {
    it('returns mapped bars', async () => {
      const raw = [{
        id: 'b1',
        company_id: 'c1',
        score_type: 'gets_it',
        core_value_name: null,
        required_score: '+',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }];
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: raw, error: null }),
          }),
        }),
      } as any);
      const result = await AnalyzerService.getBars('c1');
      expect(result).toHaveLength(1);
      expect(result[0].score_type).toBe('gets_it');
      expect(result[0].required_score).toBe('+');
    });
  });

  describe('deleteScore', () => {
    it('succeeds without error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);
      await expect(AnalyzerService.deleteScore('s1')).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
        }),
      } as any);
      await expect(AnalyzerService.deleteScore('s1')).rejects.toThrow('delete failed');
    });
  });

  describe('getEvaluationDatesForUsers', () => {
    it('returns empty record for empty userIds', async () => {
      const result = await AnalyzerService.getEvaluationDatesForUsers([], 'c1');
      expect(result).toEqual({});
    });
  });
});
