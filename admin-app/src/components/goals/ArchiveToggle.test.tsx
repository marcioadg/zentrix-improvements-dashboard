import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchiveToggle } from './ArchiveToggle';

describe('ArchiveToggle', () => {
  it('renders without crashing', () => {
    render(<ArchiveToggle showArchived={false} onToggle={vi.fn()} />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('renders switch with correct aria-label', () => {
    render(<ArchiveToggle showArchived={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Toggle archived goals' })).toBeInTheDocument();
  });

  it('calls onToggle when switch is clicked', () => {
    const onToggle = vi.fn();
    render(<ArchiveToggle showArchived={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalled();
  });
});
