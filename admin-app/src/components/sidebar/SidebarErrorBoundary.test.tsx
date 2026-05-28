import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { SidebarErrorBoundary } from './SidebarErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

const GoodComponent = () => <div>Good content</div>;

describe('SidebarErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <SidebarErrorBoundary>
        <GoodComponent />
      </SidebarErrorBoundary>
    );
    expect(screen.getByText('Good content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <SidebarErrorBoundary>
        <ThrowingComponent />
      </SidebarErrorBoundary>
    );
    expect(screen.getByText('Sidebar encountered an error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
