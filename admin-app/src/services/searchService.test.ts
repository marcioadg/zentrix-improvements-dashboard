import { vi } from 'vitest';
import { getSearchResults, setNavigateFunction } from './searchService';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/contexts/CommandPaletteContext', () => ({}));

describe('searchService', () => {
  describe('getSearchResults', () => {
    it('returns an array with 3 categories', () => {
      const results = getSearchResults('');
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
    });

    it('contains Pages, Settings, and Quick Actions categories', () => {
      const results = getSearchResults('');
      const categoryNames = results.map((c: any) => c.name);
      expect(categoryNames).toContain('Pages');
      expect(categoryNames).toContain('Settings');
      expect(categoryNames).toContain('Quick Actions');
    });

    it('each category has a results array', () => {
      const results = getSearchResults('');
      results.forEach((category: any) => {
        expect(Array.isArray(category.results)).toBe(true);
      });
    });

    it('each result has required properties', () => {
      const results = getSearchResults('');
      results.forEach((category: any) => {
        category.results.forEach((result: any) => {
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('category');
          expect(result).toHaveProperty('action');
          expect(result).toHaveProperty('icon');
        });
      });
    });

    it('action functions exist and are callable', () => {
      const results = getSearchResults('');
      results.forEach((category: any) => {
        category.results.forEach((result: any) => {
          expect(typeof result.action).toBe('function');
        });
      });
    });
  });

  describe('setNavigateFunction', () => {
    it('sets the navigate function and actions use it', () => {
      const mockNavigate = vi.fn();
      setNavigateFunction(mockNavigate);

      const results = getSearchResults();
      const pagesCategory = results.find((c: any) => c.name === 'Pages');
      expect(pagesCategory).toBeDefined();

      if (pagesCategory && pagesCategory.results.length > 0) {
        pagesCategory.results[0].action();
        expect(mockNavigate).toHaveBeenCalled();
      }
    });

    it('Pages category has expected items', () => {
      const results = getSearchResults();
      const pages = results.find((c: any) => c.name === 'Pages');
      expect(pages!.results.length).toBeGreaterThanOrEqual(6);
      const ids = pages!.results.map((r: any) => r.id);
      expect(ids).toContain('dashboard');
      expect(ids).toContain('people');
      expect(ids).toContain('tasks');
      expect(ids).toContain('goals');
      expect(ids).toContain('metrics');
      expect(ids).toContain('meetings');
    });

    it('Settings category has expected items', () => {
      const results = getSearchResults();
      const settings = results.find((c: any) => c.name === 'Settings');
      const ids = settings!.results.map((r: any) => r.id);
      expect(ids).toContain('profile-settings');
      expect(ids).toContain('app-settings');
      expect(ids).toContain('permissions');
    });

    it('Quick Actions category has expected items', () => {
      const results = getSearchResults();
      const actions = results.find((c: any) => c.name === 'Quick Actions');
      const ids = actions!.results.map((r: any) => r.id);
      expect(ids).toContain('add-member');
      expect(ids).toContain('create-task');
      expect(ids).toContain('set-goal');
      expect(ids).toContain('schedule-meeting');
    });

    it('actions fall back to window.location when no navigate function', () => {
      setNavigateFunction(null as any);
      const results = getSearchResults();
      const pages = results.find((c: any) => c.name === 'Pages');
      // Should not throw when called without navigate function
      expect(() => pages!.results[0].action()).not.toThrow();
    });
  });
});
