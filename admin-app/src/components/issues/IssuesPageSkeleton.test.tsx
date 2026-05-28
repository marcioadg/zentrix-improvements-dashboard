import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  IssuesPageSkeleton,
  IssuesLoadingSkeleton,
  MobileIssuesLoadingSkeleton,
  IssuesMeetingSkeleton,
} from './IssuesPageSkeleton';

describe('IssuesPageSkeleton', () => {
  it('renders desktop variant by default', () => {
    render(<IssuesPageSkeleton />);
    expect(screen.getByLabelText('Loading issues page')).toBeInTheDocument();
  });

  it('renders mobile variant', () => {
    render(<IssuesPageSkeleton variant="mobile" />);
    expect(screen.getByLabelText('Loading mobile issues page')).toBeInTheDocument();
  });

  it('renders screen reader announcement', () => {
    render(<IssuesPageSkeleton />);
    expect(screen.getByText(/Loading your issues dashboard/)).toBeInTheDocument();
  });

  it('renders with custom itemCount', () => {
    render(<IssuesPageSkeleton itemCount={3} />);
    const items = screen.getAllByLabelText('Loading issue title');
    expect(items.length).toBe(3);
  });
});

describe('IssuesLoadingSkeleton', () => {
  it('renders without crashing', () => {
    render(<IssuesLoadingSkeleton />);
    expect(screen.getByLabelText('Loading issues page')).toBeInTheDocument();
  });
});

describe('MobileIssuesLoadingSkeleton', () => {
  it('renders mobile variant', () => {
    render(<MobileIssuesLoadingSkeleton />);
    expect(screen.getByLabelText('Loading mobile issues page')).toBeInTheDocument();
  });
});

describe('IssuesMeetingSkeleton', () => {
  it('renders without crashing', () => {
    render(<IssuesMeetingSkeleton />);
    expect(screen.getByText(/Loading meeting issues/)).toBeInTheDocument();
  });
});
