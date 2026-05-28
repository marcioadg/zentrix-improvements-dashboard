/**
 * Safe wrapper around localStorage that handles private browsing,
 * storage quota exceeded, and other runtime errors gracefully.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or private browsing — silently degrade
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or private browsing — silently degrade
    }
  },
};

/**
 * Safe wrapper around sessionStorage that handles private browsing,
 * storage quota exceeded, and other runtime errors gracefully.
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage full or private browsing — silently degrade
    }
  },

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
