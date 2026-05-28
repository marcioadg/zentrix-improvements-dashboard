import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUpdateSettings = vi.fn();
const mockSettings = { invert_org_chart_colors: false };

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: mockSettings, updateSettings: mockUpdateSettings, loading: false }),
}));

import { OrgChartColorSettings } from './OrgChartColorSettings';

beforeEach(() => vi.clearAllMocks());

describe('OrgChartColorSettings', () => {
  it('renders org chart color settings', () => {
    render(<OrgChartColorSettings />);
    expect(screen.getByText('Org Chart Display')).toBeInTheDocument();
    expect(screen.getByText(/Customize how colors are displayed/)).toBeInTheDocument();
  });

  it('shows Culture Index label when not inverted', () => {
    render(<OrgChartColorSettings />);
    expect(screen.getByText(/Currently using Culture Index/)).toBeInTheDocument();
  });

  it('renders the switch control', () => {
    render(<OrgChartColorSettings />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});
