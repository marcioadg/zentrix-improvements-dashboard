vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { calculateHealthScore, getScoreVariant } from './companyHealthScore';

describe('calculateHealthScore', () => {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it('returns A+ grade for perfect health', () => {
    const result = calculateHealthScore(
      new Date().toISOString(), // logged in today
      80,                       // high usage (10+ per user)
      8,                        // 8 users
      0,                        // none pending
      daysAgo(60),              // established account
    );
    expect(result.recency).toBe(40);
    expect(result.usage).toBe(30);
    expect(result.adoption).toBe(20);
    expect(result.bonus).toBe(10);
    expect(result.total).toBe(100);
    expect(result.grade).toBe('A+');
    expect(result.label).toBe('Excellent');
    expect(result.color).toBe('green');
  });

  it('returns recency=0 when no login ever (null)', () => {
    const result = calculateHealthScore(null as any, 0, 5, 0, daysAgo(60));
    expect(result.recency).toBe(0);
    expect(result.total).toBeLessThan(40);
  });

  it('scores recency tiers correctly', () => {
    // <=1 day = 40
    expect(calculateHealthScore(daysAgo(0), 0, 0, 0, daysAgo(1)).recency).toBe(40);
    // <=3 days = 35
    expect(calculateHealthScore(daysAgo(2), 0, 0, 0, daysAgo(10)).recency).toBe(35);
    // <=7 days = 28
    expect(calculateHealthScore(daysAgo(5), 0, 0, 0, daysAgo(10)).recency).toBe(28);
    // <=14 days = 20
    expect(calculateHealthScore(daysAgo(10), 0, 0, 0, daysAgo(30)).recency).toBe(20);
    // <=30 days = 12
    expect(calculateHealthScore(daysAgo(20), 0, 0, 0, daysAgo(60)).recency).toBe(12);
    // <=60 days = 4
    expect(calculateHealthScore(daysAgo(45), 0, 0, 0, daysAgo(90)).recency).toBe(4);
    // >60 days = 0
    expect(calculateHealthScore(daysAgo(90), 0, 0, 0, daysAgo(120)).recency).toBe(0);
  });

  it('scores usage tiers correctly', () => {
    // per-user hours >=10 → 30
    expect(calculateHealthScore(daysAgo(0), 50, 5, 0, daysAgo(60)).usage).toBe(30);
    // per-user hours >=5 → 24
    expect(calculateHealthScore(daysAgo(0), 25, 5, 0, daysAgo(60)).usage).toBe(24);
    // per-user hours >=2 → 18
    expect(calculateHealthScore(daysAgo(0), 10, 5, 0, daysAgo(60)).usage).toBe(18);
    // per-user hours >=1 → 12
    expect(calculateHealthScore(daysAgo(0), 5, 5, 0, daysAgo(60)).usage).toBe(12);
    // per-user hours >=0.5 → 6
    expect(calculateHealthScore(daysAgo(0), 2.5, 5, 0, daysAgo(60)).usage).toBe(6);
    // per-user hours >0 → 2
    expect(calculateHealthScore(daysAgo(0), 0.5, 5, 0, daysAgo(60)).usage).toBe(2);
    // 0 usage → 0
    expect(calculateHealthScore(daysAgo(0), 0, 5, 0, daysAgo(60)).usage).toBe(0);
  });

  it('scores adoption tiers correctly', () => {
    // all active (rate=1) → 20
    expect(calculateHealthScore(daysAgo(0), 10, 5, 0, daysAgo(60)).adoption).toBe(20);
    // adoptionRate = userCount / (userCount + pendingCount)
    // 75% active: 6/(6+2)=0.75 → 15
    expect(calculateHealthScore(daysAgo(0), 10, 6, 2, daysAgo(60)).adoption).toBe(15);
    // 50% active: 5/(5+5)=0.5 → 10
    expect(calculateHealthScore(daysAgo(0), 10, 5, 5, daysAgo(60)).adoption).toBe(10);
    // 25% active: 2/(2+6)=0.25 → 5
    expect(calculateHealthScore(daysAgo(0), 10, 2, 6, daysAgo(60)).adoption).toBe(5);
    // <25%: 1/(1+9)=0.1 → 2
    expect(calculateHealthScore(daysAgo(0), 10, 1, 9, daysAgo(60)).adoption).toBe(2);
    // 0 total users → 2
    expect(calculateHealthScore(daysAgo(0), 10, 0, 0, daysAgo(60)).adoption).toBe(2);
  });

  it('scores bonus correctly for new account with usage', () => {
    const result = calculateHealthScore(daysAgo(0), 10, 5, 0, daysAgo(3));
    expect(result.bonus).toBe(10);
  });

  it('scores bonus correctly for established account with usage', () => {
    const result = calculateHealthScore(daysAgo(0), 10, 5, 0, daysAgo(60));
    expect(result.bonus).toBe(10);
  });

  it('gives bonus=5 for some usage in middle-age account', () => {
    const result = calculateHealthScore(daysAgo(0), 1, 5, 0, daysAgo(15));
    expect(result.bonus).toBe(5);
  });

  it('gives bonus=0 for no usage', () => {
    const result = calculateHealthScore(daysAgo(0), 0, 5, 0, daysAgo(15));
    expect(result.bonus).toBe(0);
  });

  it('returns correct grades at boundaries', () => {
    // We test grade logic via total scores
    // >=85 → A+ Excellent green
    const perfect = calculateHealthScore(daysAgo(0), 80, 8, 0, daysAgo(60));
    expect(perfect.grade).toBe('A+');
    expect(perfect.label).toBe('Excellent');
    expect(perfect.color).toBe('green');

    // Low score → D Critical red
    const terrible = calculateHealthScore(null as any, 0, 0, 0, daysAgo(15));
    expect(terrible.total).toBeLessThan(40);
    expect(terrible.grade).toBe('D');
    expect(terrible.label).toBe('Critical');
    expect(terrible.color).toBe('red');
  });
});

describe('getScoreVariant', () => {
  it('returns default for score >= 70', () => {
    expect(getScoreVariant(70)).toBe('default');
    expect(getScoreVariant(100)).toBe('default');
  });

  it('returns secondary for score >= 55', () => {
    expect(getScoreVariant(55)).toBe('secondary');
    expect(getScoreVariant(69)).toBe('secondary');
  });

  it('returns outline for score >= 40', () => {
    expect(getScoreVariant(40)).toBe('outline');
    expect(getScoreVariant(54)).toBe('outline');
  });

  it('returns destructive for score < 40', () => {
    expect(getScoreVariant(39)).toBe('destructive');
    expect(getScoreVariant(0)).toBe('destructive');
  });
});
