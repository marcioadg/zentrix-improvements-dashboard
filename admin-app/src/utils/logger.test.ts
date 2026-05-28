import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from './logger';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('logger', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleInfo.mockClear();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('error', () => {
    it('always logs errors', () => {
      logger.error('Error message');
      expect(mockConsoleError).toHaveBeenCalledWith('Error message');
    });

    it('logs multiple arguments', () => {
      logger.error('Error', { details: 'data' }, 123);
      expect(mockConsoleError).toHaveBeenCalledWith('Error', { details: 'data' }, 123);
    });

    it('logs error objects', () => {
      const error = new Error('Test error');
      logger.error('Failed:', error);
      expect(mockConsoleError).toHaveBeenCalledWith('Failed:', error);
    });
  });

  describe('warn', () => {
    it('always logs warnings', () => {
      logger.warn('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message');
    });

    it('logs multiple arguments', () => {
      logger.warn('Warning', { code: 'WARN_001' });
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning', { code: 'WARN_001' });
    });
  });

  describe('info', () => {
    it('respects production flag for info logs', () => {
      // We test based on import.meta.env.PROD which should be false in test
      logger.info('Info message');
      // In dev/test mode, should log to console.info
      expect(mockConsoleInfo).toHaveBeenCalledWith('Info message');
    });

    it('logs multiple arguments in development', () => {
      logger.info('Info', 'with', 'multiple', 'args');
      expect(mockConsoleInfo).toHaveBeenCalledWith('Info', 'with', 'multiple', 'args');
    });
  });

  describe('debug', () => {
    it('respects production flag for debug logs', () => {
      // In dev/test mode (import.meta.env.PROD = false), should log
      logger.debug('Debug message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Debug message');
    });

    it('logs objects with debug', () => {
      const data = { key: 'value', nested: { foo: 'bar' } };
      logger.debug('State:', data);
      expect(mockConsoleLog).toHaveBeenCalledWith('State:', data);
    });
  });

  describe('log', () => {
    it('is an alias for debug in development', () => {
      logger.log('Log message');
      expect(mockConsoleLog).toHaveBeenCalledWith('Log message');
    });

    it('logs multiple arguments', () => {
      logger.log('Start', 'middle', 'end');
      expect(mockConsoleLog).toHaveBeenCalledWith('Start', 'middle', 'end');
    });
  });

  describe('behavior with arrays and complex objects', () => {
    it('logs arrays correctly', () => {
      const arr = [1, 2, 3, { a: 1 }];
      logger.log('Array:', arr);
      expect(mockConsoleLog).toHaveBeenCalledWith('Array:', arr);
    });

    it('logs circular references without crashing', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      expect(() => logger.warn('Circular:', obj)).not.toThrow();
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('logs functions as strings', () => {
      const fn = () => console.log('test');
      logger.error('Function:', fn);
      expect(mockConsoleError).toHaveBeenCalledWith('Function:', fn);
    });
  });

  describe('empty and edge case logging', () => {
    it('handles empty arguments', () => {
      logger.log();
      expect(mockConsoleLog).toHaveBeenCalledWith();
    });

    it('handles null values', () => {
      logger.warn('Value:', null);
      expect(mockConsoleWarn).toHaveBeenCalledWith('Value:', null);
    });

    it('handles undefined values', () => {
      logger.info('Value:', undefined);
      expect(mockConsoleInfo).toHaveBeenCalledWith('Value:', undefined);
    });

    it('handles empty strings', () => {
      logger.debug('');
      expect(mockConsoleLog).toHaveBeenCalledWith('');
    });

    it('handles zero', () => {
      logger.log(0);
      expect(mockConsoleLog).toHaveBeenCalledWith(0);
    });

    it('handles false', () => {
      logger.warn(false);
      expect(mockConsoleWarn).toHaveBeenCalledWith(false);
    });
  });

  describe('multiple calls', () => {
    it('logs multiple times independently', () => {
      logger.error('First error');
      logger.warn('First warning');
      logger.error('Second error');

      expect(mockConsoleError).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it('preserves order of calls', () => {
      logger.log('1');
      logger.log('2');
      logger.log('3');

      const calls = mockConsoleLog.mock.calls;
      expect(calls[0]).toEqual(['1']);
      expect(calls[1]).toEqual(['2']);
      expect(calls[2]).toEqual(['3']);
    });
  });
});
