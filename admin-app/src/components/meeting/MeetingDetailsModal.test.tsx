import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MeetingDetailsModal } from './MeetingDetailsModal';

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock logger
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => '03/20/2026'),
}));

describe('MeetingDetailsModal', () => {
  const defaultProps = {
    open: false,
    onOpenChange: vi.fn(),
    meetingId: 'meeting-1',
    teamName: 'Team Alpha',
    meetingType: 'weekly',
    meetingDate: '2026-03-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing visible when open=false', () => {
    render(<MeetingDetailsModal {...defaultProps} open={false} />);
    // Dialog should not show content when closed
    expect(screen.queryByText('Meeting Recap')).not.toBeInTheDocument();
  });

  it('renders modal with meeting info when open=true', () => {
    render(<MeetingDetailsModal {...defaultProps} open={true} />);
    expect(screen.getByText(/Meeting Recap/)).toBeInTheDocument();
  });

  it('shows team name and meeting type in header', () => {
    render(<MeetingDetailsModal {...defaultProps} open={true} />);
    // The title is formatted as "date teamName - Meeting Recap"
    expect(screen.getByText(/Team Alpha/)).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('shows fallback message when no meeting details available', async () => {
    const { findByText } = render(<MeetingDetailsModal {...defaultProps} open={true} />);
    // After the supabase mock resolves (immediately), loading finishes and shows fallback
    const fallback = await findByText('No meeting details available');
    expect(fallback).toBeInTheDocument();
  });
});
