import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserSettings } from './useUserSettings';

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  updateThemeColor: vi.fn(),
  refetch: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      id: 'settings-1',
      user_id: 'user-1',
      highlight_current_week: false,
      show_current_week: false,
      week_start_day: 'sunday',
      vote_limit: 5,
      invert_org_chart_colors: false,
      theme_preference: 'system',
      theme_color: '∿ Thunder',
      ai_system_prompt: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    loading: false,
    updateSettings: mocks.updateSettings,
    updateThemeColor: mocks.updateThemeColor,
    refetch: mocks.refetch,
  }),
}));

vi.mock('@/contexts/MultiCompanyContext', () => ({
  useMultiCompany: () => ({
    currentCompany: { id: 'company-1' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mocks.maybeSingle,
            })),
          })),
        })),
      })),
    })),
    rpc: mocks.rpc,
  },
}));

describe('useUserSettings metrics company view settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: { show_current_week: true, highlight_current_week: false },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: [{ show_current_week: false, highlight_current_week: true }],
      error: null,
    });
  });

  it('uses company member settings and updates them through the company RPC even when a team is selected', async () => {
    const { result } = renderHook(() => useUserSettings('team-1'));

    await waitFor(() => {
      expect(result.current.settings?.show_current_week).toBe(true);
    });

    await act(async () => {
      await result.current.updateMetricsSettings({
        show_current_week: false,
        highlight_current_week: true,
      });
    });

    expect(mocks.rpc).toHaveBeenCalledWith('update_company_member_metrics_preferences', {
      p_company_id: 'company-1',
      p_show_current_week: false,
      p_highlight_current_week: true,
    });
    expect(mocks.updateSettings).not.toHaveBeenCalled();
    expect(result.current.settings?.show_current_week).toBe(false);
    expect(result.current.settings?.highlight_current_week).toBe(true);
  });
});
