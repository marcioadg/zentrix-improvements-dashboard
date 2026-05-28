export interface CustomerSuccessData {
  id: string;
  company_id: string;
  account_stage: string | null;
  customer_migration: string | null;
  customer_health: string | null;
  whatsapp_group: string | null;
  onboarding_video: string | null;
  subs_status: string | null;
  customer_status_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerSuccessRow extends CustomerSuccessData {
  company_name: string;
  mrr: number;
  customer_tier: 1 | 2 | 3;
  health_score_label?: 'Excellent' | 'Good' | 'Fair' | 'At Risk' | 'Critical';
  health_score?: number;
  red_flags?: string[];
  health_explanation?: string;
  suggested_actions?: string[];
  trial_end?: string | null;
  // Admin (responsible) info
  admin_name?: string | null;
  admin_email?: string | null;
}

// Dropdown options with color coding
export const ACCOUNT_STAGE_OPTIONS = [
  { value: 'New Customer', color: 'hsl(var(--muted))' },
  { value: 'Onboarding', color: 'hsl(270 70% 60%)' },
  { value: 'Free Trial', color: 'hsl(45 93% 47%)' },
  { value: 'Active Subscription', color: 'hsl(142 76% 36%)' },
  { value: 'At churn Risk', color: 'hsl(25 95% 53%)' },
  { value: 'Churned', color: 'hsl(0 84% 60%)' },
  { value: 'Done', color: 'hsl(0 0% 20%)' },
  { value: 'Internal Company', color: 'hsl(220 13% 46%)' },
  { value: 'Test Company', color: 'hsl(220 13% 46%)' },
] as const;

export const CUSTOMER_MIGRATION_OPTIONS = [
  { value: 'Not Necessary', color: 'hsl(var(--muted))' },
  { value: 'Pending', color: 'hsl(25 95% 53%)' },
  { value: 'In Progress', color: 'hsl(45 93% 47%)' },
  { value: 'Done', color: 'hsl(142 76% 36%)' },
] as const;

export const CUSTOMER_HEALTH_OPTIONS = [
  { value: 'Unhealthy', color: 'hsl(0 84% 60%)' },
  { value: 'Not Good', color: 'hsl(25 95% 53%)' },
  { value: 'Not bad/ Not good', color: 'hsl(270 70% 60%)' },
  { value: 'Fine', color: 'hsl(142 76% 56%)' },
  { value: 'Healthy', color: 'hsl(142 76% 36%)' },
] as const;

export const WHATSAPP_GROUP_OPTIONS = [
  { value: 'Not Necessary', color: 'hsl(var(--muted))' },
  { value: 'Pending', color: 'hsl(45 93% 47%)' },
  { value: 'Created', color: 'hsl(142 76% 36%)' },
] as const;

export const ONBOARDING_VIDEO_OPTIONS = [
  { value: 'Not Necessary', color: 'hsl(var(--muted))' },
  { value: 'Pending', color: 'hsl(45 93% 47%)' },
  { value: 'Sent', color: 'hsl(142 76% 36%)' },
] as const;

export const SUBS_STATUS_OPTIONS = [
  { value: 'Free Trial', color: 'hsl(45 93% 47%)' },
  { value: 'Premium', color: 'hsl(142 76% 36%)' },
  { value: 'Cancelled', color: 'hsl(0 72% 51%)' },
  { value: 'Expired', color: 'hsl(0 84% 60%)' },
] as const;
