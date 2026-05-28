/**
 * Tests for selectBestCompany logic in useMultiCompanyState.
 *
 * selectBestCompany determines which company to show the user on load.
 * It must:
 *  - Use the database-stored company ID when it's in the accessible list
 *  - Fall back to the first company when the stored ID is unknown/missing
 *  - Return null when the company list is empty
 */

import { describe, it, expect } from 'vitest';
import type { Company } from '@/types/multiCompany';

// ---------------------------------------------------------------------------
// Inline the pure logic from useMultiCompanyState for unit testing
// ---------------------------------------------------------------------------

function selectBestCompany(
  accessibleCompanies: Company[],
  databaseCompanyId: string | null
): Company | null {
  if (accessibleCompanies.length === 0) return null;

  if (databaseCompanyId) {
    const found = accessibleCompanies.find(c => c.id === databaseCompanyId);
    if (found) return found;
  }

  // No valid database value → return first company
  return accessibleCompanies[0];
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeCompany = (id: string, name: string): Company => ({
  id,
  name,
  slug: name.toLowerCase(),
  role: 'member',
  auto_create_overdue_issues: false,
  default_vote_limit: 5,
  require_task_before_solve: false,
});

const companyA = makeCompany('company-A', 'Acme');
const companyB = makeCompany('company-B', 'Beemo');
const companyC = makeCompany('company-C', 'Cello');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectBestCompany', () => {
  it('returns the matching company when databaseCompanyId is valid', () => {
    const result = selectBestCompany([companyA, companyB, companyC], 'company-B');
    expect(result?.id).toBe('company-B');
    expect(result?.name).toBe('Beemo');
  });

  it('falls back to first company when databaseCompanyId is not in accessible list', () => {
    const result = selectBestCompany([companyA, companyB], 'company-UNKNOWN');
    expect(result?.id).toBe('company-A');
  });

  it('falls back to first company when databaseCompanyId is null', () => {
    const result = selectBestCompany([companyA, companyB], null);
    expect(result?.id).toBe('company-A');
  });

  it('returns null when accessible companies list is empty', () => {
    const result = selectBestCompany([], 'company-A');
    expect(result).toBeNull();
  });

  it('returns null when list is empty and databaseCompanyId is null', () => {
    const result = selectBestCompany([], null);
    expect(result).toBeNull();
  });

  it('returns the single company when only one is accessible', () => {
    const result = selectBestCompany([companyC], null);
    expect(result?.id).toBe('company-C');
  });

  it('handles the multi-company user scenario: last-used company is in list', () => {
    // User switched to company-C last session
    const result = selectBestCompany([companyA, companyB, companyC], 'company-C');
    expect(result?.id).toBe('company-C');
  });

  it('handles the multi-company user scenario: last-used company was removed', () => {
    // User was removed from company-C, only A and B remain
    const result = selectBestCompany([companyA, companyB], 'company-C');
    expect(result?.id).toBe('company-A'); // graceful fallback to first
  });
});
