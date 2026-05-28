import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessRestricted } from './AccessRestricted';

describe('AccessRestricted', () => {
  it('renders access restricted message', () => {
    render(<AccessRestricted />);
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('Manager Access Required')).toBeInTheDocument();
  });

  it('shows contact administrator message', () => {
    render(<AccessRestricted />);
    expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument();
  });

  it('renders the People heading', () => {
    render(<AccessRestricted />);
    expect(screen.getByText('People')).toBeInTheDocument();
  });
});
