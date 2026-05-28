export type MetricsCompanyViewSettings = {
  show_current_week: boolean;
  highlight_current_week: boolean;
};

export const DEFAULT_METRICS_COMPANY_VIEW_SETTINGS: MetricsCompanyViewSettings = {
  show_current_week: false,
  highlight_current_week: false,
};

export const isMetricsCompanyViewSettingKey = (
  key: string
): key is keyof MetricsCompanyViewSettings => {
  return key === 'show_current_week' || key === 'highlight_current_week';
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const parseMetricsCompanyViewSettings = (
  membership?: unknown
): MetricsCompanyViewSettings | null => {
  if (!isRecord(membership)) {
    return null;
  }

  const hasShowCurrentWeek = typeof membership.show_current_week === 'boolean';
  const hasHighlightCurrentWeek = typeof membership.highlight_current_week === 'boolean';

  if (!hasShowCurrentWeek && !hasHighlightCurrentWeek) {
    return null;
  }

  return {
    show_current_week: hasShowCurrentWeek
      ? Boolean(membership.show_current_week)
      : DEFAULT_METRICS_COMPANY_VIEW_SETTINGS.show_current_week,
    highlight_current_week: hasHighlightCurrentWeek
      ? Boolean(membership.highlight_current_week)
      : DEFAULT_METRICS_COMPANY_VIEW_SETTINGS.highlight_current_week,
  };
};

export const mergeMetricsCompanyViewSettings = (
  currentSettings: MetricsCompanyViewSettings | null,
  updates: Partial<MetricsCompanyViewSettings>
): MetricsCompanyViewSettings => {
  return {
    ...(currentSettings ?? DEFAULT_METRICS_COMPANY_VIEW_SETTINGS),
    ...updates,
  };
};
