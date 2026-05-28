import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgChartErrorBoundary } from './OrgChartErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Chart error');
};

const GoodComponent = () => <div>Org chart content</div>;

describe('OrgChartErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <OrgChartErrorBoundary>
        <GoodComponent />
      </OrgChartErrorBoundary>
    );
    expect(screen.getByText('Org chart content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <OrgChartErrorBoundary>
        <ThrowingComponent />
      </OrgChartErrorBoundary>
    );
    expect(screen.getByText("Org chart couldn't load")).toBeInTheDocument();
    expect(screen.getByText(/problem rendering/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
