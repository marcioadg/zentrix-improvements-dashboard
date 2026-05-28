import { vi } from 'vitest';
import { toast } from 'sonner';
import { destructiveToastService } from './destructiveToastService';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('destructiveToastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showDestructiveToast', () => {
    it('calls toast.error with content when no title provided', () => {
      destructiveToastService.showDestructiveToast('Something went wrong');
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });

    it('calls toast.error with formatted string when title provided', () => {
      destructiveToastService.showDestructiveToast('Something went wrong', 'Error');
      expect(toast.error).toHaveBeenCalledWith('Error: Something went wrong');
    });
  });

  describe('error', () => {
    it('calls toast.error with content when no title provided', () => {
      destructiveToastService.error('An error occurred');
      expect(toast.error).toHaveBeenCalledWith('An error occurred');
    });

    it('calls toast.error with formatted string when title provided', () => {
      destructiveToastService.error('An error occurred', 'Critical');
      expect(toast.error).toHaveBeenCalledWith('Critical: An error occurred');
    });
  });
});
