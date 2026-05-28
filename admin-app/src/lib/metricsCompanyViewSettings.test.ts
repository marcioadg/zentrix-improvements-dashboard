import { describe, expect, it } from 'vitest';
import {
  DEFAULT_METRICS_COMPANY_VIEW_SETTINGS,
  mergeMetricsCompanyViewSettings,
  parseMetricsCompanyViewSettings,
} from './metricsCompanyViewSettings';

describe('metricsCompanyViewSettings', () => {
  it('returns null when company member row does not include metrics view settings', () => {
    expect(parseMetricsCompanyViewSettings(null)).toBeNull();
    expect(parseMetricsCompanyViewSettings({})).toBeNull();
  });

  it('parses metrics view settings from company member row', () => {
    expect(parseMetricsCompanyViewSettings({
      show_current_week: true,
      highlight_current_week: true,
    })).toEqual({
      show_current_week: true,
      highlight_current_week: true,
    });
  });

  it('falls back missing fields to display defaults', () => {
    expect(parseMetricsCompanyViewSettings({
      show_current_week: true,
    })).toEqual({
      ...DEFAULT_METRICS_COMPANY_VIEW_SETTINGS,
      show_current_week: true,
    });
  });

  it('merges partial updates over current settings', () => {
    expect(mergeMetricsCompanyViewSettings(
      { show_current_week: true, highlight_current_week: false },
      { highlight_current_week: true }
    )).toEqual({
      show_current_week: true,
      highlight_current_week: true,
    });
  });
});
