
import { destructiveToastService } from './destructiveToastService';
import { logger } from '@/utils/logger';

// Legacy toast service that now filters success messages
class FilteredToastService {
  // Block success messages, show only errors
  showToast(content: string, variant: 'default' | 'destructive' = 'default', title?: string): void {
    if (variant === 'destructive') {
      destructiveToastService.showDestructiveToast(content, title);
    } else {
      logger.log('🔇 Legacy toastService: Blocked non-destructive toast:', title || content);
    }
  }

  error(content: string, title?: string): void {
    destructiveToastService.error(content, title);
  }

  // Filtered methods that do nothing but log
  info(content: string, title?: string): void {
    logger.log('ℹ️ Legacy toastService: Blocked info toast:', title || content);
  }

  success(content: string, title?: string): void {
    logger.log('✅ Legacy toastService: Blocked success toast:', title || content);
  }

  // Utility methods
  clearRecent(): void {
    logger.log('Legacy toastService: clearRecent called (no-op)');
  }

  getFilteringStats() {
    return { totalFiltered: 0, recentCount: 0, duplicatesBlocked: 0 };
  }
}

// Export the filtered service to replace the old one
export const toastService = new FilteredToastService();
