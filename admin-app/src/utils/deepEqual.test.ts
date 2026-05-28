import { describe, it, expect } from 'vitest';
import { deepEqual, companyEqual } from './deepEqual';

describe('deepEqual', () => {
  it('handles identical references', () => {
    const obj = { a: 1 };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it('handles primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(null, { a: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, null)).toBe(false);
  });

  it('compares flat objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it('detects different key counts', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('detects missing keys', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });

  it('compares nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
  });

  it('compares arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('distinguishes arrays from objects', () => {
    expect(deepEqual([1], { 0: 1 })).toBe(false);
  });
});

describe('companyEqual', () => {
  const company = { id: '1', name: 'Acme', slug: 'acme', role: 'admin', extra: 'ignored' };

  it('handles identical references', () => {
    expect(companyEqual(company, company)).toBe(true);
  });

  it('handles null/undefined', () => {
    expect(companyEqual(null, null)).toBe(true);
    expect(companyEqual(null, company)).toBe(false);
    expect(companyEqual(company, null)).toBe(false);
  });

  it('compares by identity fields only', () => {
    const same = { id: '1', name: 'Acme', slug: 'acme', role: 'admin', extra: 'different' };
    expect(companyEqual(company, same)).toBe(true);
  });

  it('detects differences in identity fields', () => {
    expect(companyEqual(company, { ...company, id: '2' })).toBe(false);
    expect(companyEqual(company, { ...company, name: 'Other' })).toBe(false);
    expect(companyEqual(company, { ...company, slug: 'other' })).toBe(false);
    expect(companyEqual(company, { ...company, role: 'member' })).toBe(false);
  });
});
