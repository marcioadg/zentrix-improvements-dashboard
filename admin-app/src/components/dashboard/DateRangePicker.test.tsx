import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateRangePicker } from './DateRangePicker';

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar">Calendar</div>,
}));

describe('DateRangePicker', () => {
  it('renders without crashing', () => {
    render(<DateRangePicker onDateRangeChange={vi.fn()} />);
    expect(screen.getByText('Select date range')).toBeInTheDocument();
  });

  it('displays selected range when provided', () => {
    const range = {
      start: new Date('2026-03-01'),
      end: new Date('2026-03-15'),
    };
    render(<DateRangePicker onDateRangeChange={vi.fn()} selectedRange={range} />);
    expect(screen.getByText('2026-03-01 - 2026-03-15')).toBeInTheDocument();
  });

  it('shows placeholder when no range selected', () => {
    render(<DateRangePicker onDateRangeChange={vi.fn()} selectedRange={null} />);
    expect(screen.getByText('Select date range')).toBeInTheDocument();
  });
});
