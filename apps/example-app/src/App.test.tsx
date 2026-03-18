import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders discovered calls', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Callsheet' })).toBeTruthy();
    expect((await screen.findByTestId('selected-film')).textContent).toBe(
      'Wall-E',
    );
    expect(screen.getAllByText('Wall-E')).toHaveLength(2);
    expect(screen.getByText('Inside Out')).toBeTruthy();
    expect(screen.getByTestId('featured-call-kind').textContent).toBe('query');
    expect(screen.getByTestId('featured-call-data-key').textContent).toBe(
      'films.featured',
    );
    expect(screen.getByTestId('film-call-data-key').textContent).toBe(
      'dynamic',
    );
    expect(screen.getByTestId('selected-film').textContent).toBe('Wall-E');
  });
});
