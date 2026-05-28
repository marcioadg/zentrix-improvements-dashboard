import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeopleHeader } from './PeopleHeader';

describe('PeopleHeader', () => {
  it('renders the People heading', () => {
    render(<PeopleHeader />);
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<PeopleHeader />);
    expect(screen.getByText('Manage your team members and organizational structure')).toBeInTheDocument();
  });
});
