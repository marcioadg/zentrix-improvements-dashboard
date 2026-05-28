import { describe, it, expect } from 'vitest';
import { calculateCompanyOnboarding } from './companyOnboarding';
import { CompanyWithStats } from '@/hooks/useCompanyManagement';

const makeCompany = (overrides: Partial<CompanyWithStats> = {}): CompanyWithStats => ({
  id: '1',
  name: 'Test Co',
  slug: 'test-co',
  created_at: '2024-01-01',
  user_count: 0,
  team_count: 0,
  metrics_count: 0,
  status: 'Trial',
  last_login: null,
  directors: [],
  ...overrides,
});

describe('calculateCompanyOnboarding', () => {
  it('returns 0% when nothing is completed', () => {
    const result = calculateCompanyOnboarding(makeCompany());
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(7);
    expect(result.percentage).toBe(0);
    expect(result.items.every(i => !i.completed)).toBe(true);
  });

  it('returns 100% when everything is completed', () => {
    const result = calculateCompanyOnboarding(makeCompany({
      team_count: 1,
      goals_count: 1,
      metrics_count: 1,
      user_count: 2,
      meetings_count: 1,
      org_roles_count: 1,
      strategy_count: 1,
    }));
    expect(result.completedCount).toBe(7);
    expect(result.percentage).toBe(100);
  });

  it('calculates partial completion correctly', () => {
    const result = calculateCompanyOnboarding(makeCompany({
      team_count: 3,
      metrics_count: 2,
    }));
    expect(result.completedCount).toBe(2);
    expect(result.percentage).toBe(Math.round((2 / 7) * 100));
  });

  it('treats undefined optional counts as 0', () => {
    const result = calculateCompanyOnboarding(makeCompany());
    const goalItem = result.items.find(i => i.id === 'create-goal');
    expect(goalItem?.completed).toBe(false);
  });

  it('invite-team requires user_count > 1', () => {
    const one = calculateCompanyOnboarding(makeCompany({ user_count: 1 }));
    const two = calculateCompanyOnboarding(makeCompany({ user_count: 2 }));
    expect(one.items.find(i => i.id === 'invite-team')?.completed).toBe(false);
    expect(two.items.find(i => i.id === 'invite-team')?.completed).toBe(true);
  });
});
