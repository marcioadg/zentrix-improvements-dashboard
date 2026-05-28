
export interface WeeklyMetricWithOwner {
  id: string;
  user_id: string;
  owner_id: string;
  owner: string;
  owner_avatar_url?: string;
  owner_is_deactivated?: boolean; // Add owner deactivation status
  assistant_id?: string; // Optional assistant who can help update metric values
  assistant?: string; // Assistant display name
  assistant_avatar_url?: string; // Assistant avatar URL
  team_id: string;
  team_name?: string; // Add optional team_name property
  metric_name: string;
  description?: string;
  metric_value: number | null;
  target_value: number | null;
  target_logic: string | null;
  unit: string;
  week_start_date: string;
  created_at: string;
  updated_at: string;
  archived?: boolean; // Add archived property
  display_order?: number | null; // Add display_order property
  weeklyValues: { [weekStart: string]: number | null };
  weeklyCustomTargets?: { 
    [weekStart: string]: {
      custom_target_value: number | null;
      target_note: string | null;
    }
  };
  aggregatedCustomTargets?: {
    [periodLabel: string]: number | null;
  };
  is_formula?: boolean;
  formula_components?: FormulaComponent[];
  aggregation_type?: string;
  formula_error?: string; // Error message if formula calculation failed (e.g., deleted metric reference)
  formula_error_type?: 'METRIC_NOT_FOUND' | 'INVALID_FORMULA' | 'CALCULATION_ERROR' | 'DIVISION_BY_ZERO';
}

export interface FormulaComponent {
  type: 'metric' | 'number' | 'operator';
  value: string;
  displayName?: string;
}

export interface MetricFormData {
  metric_name: string;
  owner_id: string;
  assistant_id?: string; // Optional assistant
  unit: string;
  target_value?: number;
  target_logic?: string;
  is_formula?: boolean;
  formula_components?: FormulaComponent[];
  aggregation_type?: string;
}

export interface MetricValue {
  metricId: string;
  weekStart: string;
  value: number | null;
}

export interface CustomTarget {
  custom_target_value: number | null;
  target_note: string | null;
}
