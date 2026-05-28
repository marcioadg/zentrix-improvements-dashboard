import { vi } from 'vitest';
import { destructiveToastService } from './destructiveToastService';
import { logger } from '@/utils/logger';
import { toastService } from './toastService';

vi.mock('./destructiveToastService', () => ({
  destructiveToastService: { showDestructiveToast: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

describe('FilteredToastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showToast', () => {
    it('delegates to destructiveToastService when variant is destructive', () => {
      toastService.showToast('Error message', 'destructive', 'Error Title');
      expect(destructiveToastService.showDestructiveToast).toHaveBeenCalledWith('Error message', 'Error Title');
    });

    it('delegates to destructiveToastService with destructive variant and no title', () => {
      toastService.showToast('Error message', 'destructive');
      expect(destructiveToastService.showDestructiveToast).toHaveBeenCalledWith('Error message', undefined);
    });

    it('logs instead of showing toast when variant is default', () => {
      toastService.showToast('Info message', 'default', 'Info Title');
      expect(logger.log).toHaveBeenCalled();
      expect(destructiveToastService.showDestructiveToast).not.toHaveBeenCalled();
    });

    it('defaults to default variant when none specified', () => {
      toastService.showToast('Some message');
      expect(logger.log).toHaveBeenCalled();
      expect(destructiveToastService.showDestructiveToast).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('delegates to destructiveToastService.error', () => {
      toastService.error('Error content', 'Error Title');
      expect(destructiveToastService.error).toHaveBeenCalledWith('Error content', 'Error Title');
    });
  });

  describe('info', () => {
    it('logs instead of showing toast', () => {
      toastService.info('Info content', 'Info Title');
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('logs instead of showing toast', () => {
      toastService.success('Success content', 'Success Title');
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('clearRecent', () => {
    it('is callable without error', () => {
      expect(() => toastService.clearRecent()).not.toThrow();
    });
  });

  describe('getFilteringStats', () => {
    it('returns an object with all zero values', () => {
      const stats = toastService.getFilteringStats();
      expect(stats).toEqual({
        totalFiltered: 0,
        recentCount: 0,
        duplicatesBlocked: 0,
      });
    });
  });
});
