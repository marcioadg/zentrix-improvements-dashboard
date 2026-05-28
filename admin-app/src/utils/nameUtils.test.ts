import { describe, it, expect, vi } from "vitest";

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getInitials } from './nameUtils';

describe('getInitials', () => {
  it('returns first+last initials for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns first+last initials for name with middle', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
  });

  it('falls through to email when name is empty string', () => {
    expect(getInitials('', 'jane.doe@example.com')).toBe('JA');
  });

  it('falls through to email when name is whitespace', () => {
    expect(getInitials('   ', 'bob.smith@example.com')).toBe('BO');
  });

  it('returns first 2 chars uppercase from email with 3+ chars and no numbers', () => {
    expect(getInitials(undefined, 'charlie@example.com')).toBe('CH');
  });

  it('returns ?? when email part contains numbers', () => {
    expect(getInitials(undefined, 'user123@example.com')).toBe('??');
  });

  it('returns ?? when email part is too short', () => {
    expect(getInitials(undefined, 'ab@example.com')).toBe('??');
  });

  it('returns ?? when first two chars are repeated', () => {
    expect(getInitials(undefined, 'aardvark@example.com')).toBe('??');
  });

  it('returns ?? when no name and no email', () => {
    expect(getInitials()).toBe('??');
  });

  it('returns ?? when name is undefined and email is undefined', () => {
    expect(getInitials(undefined, undefined)).toBe('??');
  });
});
