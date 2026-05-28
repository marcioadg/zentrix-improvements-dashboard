import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickActionsHub } from './QuickActionsHub';
import { MemoryRouter } from 'react-router-dom';

describe('QuickActionsHub', () => {
  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <QuickActionsHub />
      </MemoryRouter>
    );

  it('renders without crashing', () => {
    renderWithRouter();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders all quick action buttons', () => {
    renderWithRouter();
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.getByText('Add Goal')).toBeInTheDocument();
    expect(screen.getByText('Add Metric')).toBeInTheDocument();
    expect(screen.getByText('Report Issue')).toBeInTheDocument();
    expect(screen.getByText('Schedule Meeting')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders correct number of actions (6)', () => {
    renderWithRouter();
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(6);
  });
});
