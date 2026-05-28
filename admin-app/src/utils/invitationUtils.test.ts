import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { InvitationLogger, validateInvitationParams, createInvitationError, getErrorDisplayInfo } from './invitationUtils';

describe('InvitationLogger', () => {
  beforeEach(() => {
    InvitationLogger.clearLogs();
  });

  it('logs messages with timestamp', () => {
    InvitationLogger.log('test message');
    const logs = InvitationLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('test message');
  });

  it('logs messages with data', () => {
    InvitationLogger.log('with data', { foo: 'bar' });
    const logs = InvitationLogger.getLogs();
    expect(logs[0]).toContain('{"foo":"bar"}');
  });

  it('logs errors', () => {
    InvitationLogger.error('fail', { code: 500 });
    const logs = InvitationLogger.getLogs();
    expect(logs[0]).toContain('ERROR: fail');
    expect(logs[0]).toContain('500');
  });

  it('returns a copy from getLogs', () => {
    InvitationLogger.log('a');
    const logs = InvitationLogger.getLogs();
    logs.push('injected');
    expect(InvitationLogger.getLogs()).toHaveLength(1);
  });

  it('clearLogs empties the log array', () => {
    InvitationLogger.log('a');
    InvitationLogger.clearLogs();
    expect(InvitationLogger.getLogs()).toHaveLength(0);
  });
});

describe('deprecated invitation helpers', () => {
  it('validateInvitationParams returns isValid false', () => {
    expect(validateInvitationParams()).toEqual({ isValid: false, error: null, data: null });
  });

  it('createInvitationError returns null', () => {
    expect(createInvitationError()).toBeNull();
  });

  it('getErrorDisplayInfo returns deprecation info', () => {
    const info = getErrorDisplayInfo();
    expect(info.title).toBe('Deprecated Function');
    expect(info.showResendOption).toBe(false);
  });
});
