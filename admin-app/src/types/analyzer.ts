
export interface AnalyzerScore {
  id: string;
  user_id: string;
  company_id: string;
  core_value_name?: string | null;
  score_type: 'core_value' | 'gets_it' | 'wants_it' | 'capacity';
  score_value: '+' | '+/-' | '-';
  evaluated_by: string;
  created_at: string;
  updated_at: string;
  evaluation_date: string; // Date in YYYY-MM-DD format
}

export interface AnalyzerBar {
  id: string;
  company_id: string;
  score_type: 'core_value' | 'gets_it' | 'wants_it' | 'capacity';
  core_value_name?: string | null;
  required_score: '+' | '+/-' | '-';
  created_at: string;
  updated_at: string;
}

export interface AnalyzerPerson {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active?: boolean;
  scores: Record<string, '+' | '+/-' | '-'>;
  totalScore: number;
  meetsBar: boolean;
  visibilityLabel?: string;
  visibleToCount?: number;
  visiblePeople?: Array<{ name: string; role: string }>;
  lastUpdated?: string; // Most recent updated_at from all scores
}

export interface CoreValue {
  name: string;
  description?: string;
}

export type ScoreValue = '+' | '+/-' | '-';

export interface AnalyzerColumn {
  key: string;
  label: string;
  type: 'core_value' | 'gets_it' | 'wants_it' | 'capacity';
  core_value_name?: string | null;
  explanation?: string;
}
