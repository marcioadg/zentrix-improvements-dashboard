import { getInputErrorClass, getLabelErrorClass, isFieldEmpty, isArrayEmpty } from './formValidation';

describe('getInputErrorClass', () => {
  it('returns error class when hasError and attemptedSubmit are true', () => {
    expect(getInputErrorClass(true, true)).toBe('border-destructive focus-visible:ring-destructive/30');
  });

  it('returns empty string when hasError is false', () => {
    expect(getInputErrorClass(false, true)).toBe('');
  });

  it('returns empty string when attemptedSubmit is false', () => {
    expect(getInputErrorClass(true, false)).toBe('');
  });

  it('returns empty string when both are false', () => {
    expect(getInputErrorClass(false, false)).toBe('');
  });

  it('defaults attemptedSubmit to true', () => {
    expect(getInputErrorClass(true)).toBe('border-destructive focus-visible:ring-destructive/30');
  });
});

describe('getLabelErrorClass', () => {
  it('returns error class when hasError and attemptedSubmit are true', () => {
    expect(getLabelErrorClass(true, true)).toBe('text-destructive');
  });

  it('returns empty string when hasError is false', () => {
    expect(getLabelErrorClass(false, true)).toBe('');
  });

  it('returns empty string when attemptedSubmit is false', () => {
    expect(getLabelErrorClass(true, false)).toBe('');
  });

  it('returns empty string when both are false', () => {
    expect(getLabelErrorClass(false, false)).toBe('');
  });

  it('defaults attemptedSubmit to true', () => {
    expect(getLabelErrorClass(true)).toBe('text-destructive');
  });
});

describe('isFieldEmpty', () => {
  it('returns true for null', () => {
    expect(isFieldEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isFieldEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isFieldEmpty('')).toBe(true);
  });

  it('returns true for whitespace only', () => {
    expect(isFieldEmpty('   ')).toBe(true);
  });

  it('returns false for valid string', () => {
    expect(isFieldEmpty('hello')).toBe(false);
  });
});

describe('isArrayEmpty', () => {
  it('returns true for null', () => {
    expect(isArrayEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isArrayEmpty(undefined)).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isArrayEmpty([])).toBe(true);
  });

  it('returns false for populated array', () => {
    expect(isArrayEmpty([1, 2, 3])).toBe(false);
  });
});
