import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));

import { calculateFormula, validateFormulaComponents } from './formulaCalculationService';

const mockMetrics = [
  { id: 'metric-1', metric_name: 'Revenue', weeklyValues: { '2024-01-01': 100 } },
  { id: 'metric-2', metric_name: 'Costs', weeklyValues: { '2024-01-01': 50 } },
  { id: 'metric-3', metric_name: 'ZeroMetric', weeklyValues: { '2024-01-01': 0 } },
] as any[];

describe('calculateFormula', () => {
  it('returns error for empty components', () => {
    const result = calculateFormula([], mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
  });

  it('returns error for null components', () => {
    const result = calculateFormula(null as any, mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
  });

  it('calculates simple addition: metric1 + metric2', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(150);
  });

  it('handles assignment formula: result = metric1', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(100);
  });

  it('returns DIVISION_BY_ZERO error when dividing by zero', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '/' },
      { type: 'metric' as const, value: 'metric-3', displayName: 'ZeroMetric' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
    expect(result.errorType).toBe('DIVISION_BY_ZERO');
  });

  it('returns METRIC_NOT_FOUND error for missing metric', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-999', displayName: 'Missing' },
      { type: 'operator' as const, value: '+' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
    expect(result.errorType).toBe('METRIC_NOT_FOUND');
  });

  it('treats null metric value as 0', () => {
    const metricsWithNull = [
      { id: 'metric-null', metric_name: 'NullMetric', weeklyValues: {} },
    ] as any[];
    const components = [
      { type: 'metric' as const, value: 'metric-null', displayName: 'NullMetric' },
      { type: 'operator' as const, value: '+' },
      { type: 'number' as const, value: '10' },
    ];
    const result = calculateFormula(components, metricsWithNull, '2024-01-01');
    expect(result.value).toBe(10);
  });

  it('converts × to * and ÷ to / in arithmetic with metrics', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '×' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(5000); // 100 * 50

    const divComponents = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '÷' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const divResult = calculateFormula(divComponents, mockMetrics, '2024-01-01');
    expect(divResult.value).toBe(2); // 100 / 50
  });

  it('returns error for invalid number', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'number' as const, value: 'abc' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
  });

  it('returns error for invalid operator', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '^' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toBeDefined();
  });
});

describe('validateFormulaComponents', () => {
  const availableMetrics = [
    { id: 'metric-1', metric_name: 'Revenue' },
    { id: 'metric-2', metric_name: 'Costs' },
  ] as any[];

  it('returns invalid for empty components', () => {
    const result = validateFormulaComponents([], availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns valid for correct arithmetic formula', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid when operator is missing between values', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid when formula ends with operator', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid when no metrics are referenced', () => {
    const components = [
      { type: 'number' as const, value: '10' },
      { type: 'operator' as const, value: '+' },
      { type: 'number' as const, value: '20' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for consecutive operators', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'operator' as const, value: '-' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns valid for single metric (assignment-like)', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for assignment formula with missing metric', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-999', displayName: 'Missing' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for unknown component type', () => {
    const components = [
      { type: 'unknown' as any, value: 'foo' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unknown component type');
  });

  it('returns invalid for invalid operator', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '%' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid operator');
  });

  it('returns invalid for operator at start', () => {
    const components = [
      { type: 'operator' as const, value: '+' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid operator placement');
  });

  it('returns invalid for invalid number', () => {
    const components = [
      { type: 'number' as const, value: 'abc' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid number');
  });

  it('returns invalid for two consecutive numbers', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'number' as const, value: '5' },
      { type: 'number' as const, value: '10' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Missing operator between values');
  });

  it('validates assignment formula with valid right side', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for multiple = operators', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only one "=" operator');
  });

  it('returns invalid for assignment with empty right side', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('No value specified after "="');
  });

  it('returns invalid for null components', () => {
    const result = validateFormulaComponents(null as any, availableMetrics);
    expect(result.isValid).toBe(false);
  });

  it('validates metric found by name fallback', () => {
    const components = [
      { type: 'metric' as const, value: 'not-a-real-id', displayName: 'Revenue' },
    ];
    const result = validateFormulaComponents(components, availableMetrics);
    expect(result.isValid).toBe(true);
  });
});

describe('calculateFormula edge cases', () => {
  it('handles assignment formula with empty right side', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toContain('No value specified');
  });

  it('handles assignment formula with complex right side', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '-' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(50); // 100 - 50
  });

  it('handles assignment with metric found by name fallback', () => {
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'not-a-real-id', displayName: 'Revenue' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(100);
  });

  it('handles assignment with null metric value returning 0', () => {
    const metricsWithNull = [
      { id: 'metric-null', metric_name: 'NullMetric', weeklyValues: {} },
    ] as any[];
    const components = [
      { type: 'metric' as const, value: 'result', displayName: 'Result' },
      { type: 'operator' as const, value: '=' },
      { type: 'metric' as const, value: 'metric-null', displayName: 'NullMetric' },
    ];
    const result = calculateFormula(components, metricsWithNull, '2024-01-01');
    expect(result.value).toBe(0);
  });

  it('handles unknown component type in arithmetic', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '+' },
      { type: 'unknown' as any, value: 'foo' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.error).toContain('Unknown component type');
  });

  it('subtraction works correctly', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '-' },
      { type: 'metric' as const, value: 'metric-2', displayName: 'Costs' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(50); // 100 - 50
  });

  it('metric with number works', () => {
    const components = [
      { type: 'metric' as const, value: 'metric-1', displayName: 'Revenue' },
      { type: 'operator' as const, value: '*' },
      { type: 'number' as const, value: '2' },
    ];
    const result = calculateFormula(components, mockMetrics, '2024-01-01');
    expect(result.value).toBe(200);
  });
});
