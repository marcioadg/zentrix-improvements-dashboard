import { cn, getInitials } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('getInitials', () => {
  it('returns null for null input', () => {
    expect(getInitials(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getInitials(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getInitials('')).toBeNull();
  });

  it('returns null for "unknown" prefix', () => {
    expect(getInitials('unknown user')).toBeNull();
    expect(getInitials('Unknown')).toBeNull();
  });

  it('returns null for single character', () => {
    expect(getInitials('A')).toBeNull();
  });

  it('returns first letter uppercase for single word', () => {
    // getInitials maps each space-separated part to its first char
    expect(getInitials('alice')).toBe('A');
  });

  it('returns initials for two words', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('trims whitespace', () => {
    expect(getInitials('  Jane Smith  ')).toBe('JS');
  });

  it('returns max 2 chars', () => {
    expect(getInitials('Ana Banana Cabana')).toBe('AB');
  });
});
