import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeStorage } from './safeStorage';

describe('safeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getItem / setItem', () => {
    it('stores and retrieves a value', () => {
      safeStorage.setItem('key', 'value');
      expect(safeStorage.getItem('key')).toBe('value');
    });

    it('returns null for missing key', () => {
      expect(safeStorage.getItem('missing')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('removes a stored key', () => {
      safeStorage.setItem('key', 'value');
      safeStorage.removeItem('key');
      expect(safeStorage.getItem('key')).toBeNull();
    });
  });

  describe('getJSON / setJSON', () => {
    it('round-trips JSON objects', () => {
      safeStorage.setJSON('obj', { a: 1, b: [2, 3] });
      expect(safeStorage.getJSON('obj', null)).toEqual({ a: 1, b: [2, 3] });
    });

    it('returns fallback when key is missing', () => {
      expect(safeStorage.getJSON('missing', { default: true })).toEqual({ default: true });
    });

    it('returns fallback when stored value is invalid JSON', () => {
      localStorage.setItem('bad', '{not json');
      expect(safeStorage.getJSON('bad', 'fallback')).toBe('fallback');
    });
  });

  describe('error handling', () => {
    it('getItem returns null when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(safeStorage.getItem('key')).toBeNull();
      spy.mockRestore();
    });

    it('setItem does not throw when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      expect(() => safeStorage.setItem('key', 'val')).not.toThrow();
      spy.mockRestore();
    });

    it('removeItem does not throw when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(() => safeStorage.removeItem('key')).not.toThrow();
      spy.mockRestore();
    });
  });
});
