import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SopsSidebar } from './SopsSidebar';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock hooks
vi.mock('@/hooks/sops/useSpaces', () => ({
  useSpaces: vi.fn(() => ({
    spaces: [{ id: 's1', name: 'Space 1', icon: null }],
  })),
}));

vi.mock('@/hooks/sops/usePages', () => ({
  usePages: vi.fn(() => ({
    pages: [
      { id: 'p1', title: 'Page 1', space_id: 's1', parent_page_id: null },
      { id: 'p2', title: 'Another Page', space_id: 's1', parent_page_id: null },
    ],
  })),
}));

describe('SopsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SopsSidebar />);
    expect(screen.getByText('SOPs Home')).toBeInTheDocument();
  });

  it('shows "SOPs Home" button', () => {
    render(<SopsSidebar />);
    const homeButton = screen.getByRole('button', { name: /sops home/i });
    expect(homeButton).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<SopsSidebar />);
    const searchInput = screen.getByPlaceholderText('Search pages...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders space names', () => {
    render(<SopsSidebar />);
    expect(screen.getByText('Space 1')).toBeInTheDocument();
  });

  it('filters pages when searching', () => {
    render(<SopsSidebar />);
    const searchInput = screen.getByPlaceholderText('Search pages...');

    // First expand the space to see pages
    const spaceButton = screen.getByText('Space 1').closest('button')!;
    fireEvent.click(spaceButton);

    // Both pages should be visible
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Another Page')).toBeInTheDocument();

    // Type in search to filter
    fireEvent.change(searchInput, { target: { value: 'Another' } });

    // Only matching page should remain
    expect(screen.getByText('Another Page')).toBeInTheDocument();
    expect(screen.queryByText('Page 1')).not.toBeInTheDocument();
  });
});
