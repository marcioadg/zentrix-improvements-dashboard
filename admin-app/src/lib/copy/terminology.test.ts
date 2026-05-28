import { terminology } from './terminology';

describe('terminology.entity', () => {
  it('returns singular form for count 1', () => {
    expect(terminology.entity('goal')).toBe('Goal');
    expect(terminology.entity('task', 1)).toBe('Task');
  });

  it('returns plural form for count > 1', () => {
    expect(terminology.entity('goal', 2)).toBe('Goals');
    expect(terminology.entity('task', 5)).toBe('Tasks');
  });

  it('is case insensitive', () => {
    expect(terminology.entity('Goal')).toBe('Goal');
    expect(terminology.entity('TASK', 2)).toBe('Tasks');
  });

  it('returns undefined for unknown type', () => {
    expect(terminology.entity('unknown_type')).toBeUndefined();
  });
});

describe('terminology.noEntityYet', () => {
  it('formats correctly', () => {
    expect(terminology.noEntityYet('goal')).toBe('No goals yet');
    expect(terminology.noEntityYet('task')).toBe('No tasks yet');
  });
});

describe('terminology.loadingEntity', () => {
  it('formats correctly', () => {
    expect(terminology.loadingEntity('goal')).toBe('Loading goals...');
    expect(terminology.loadingEntity('task')).toBe('Loading tasks...');
  });
});
