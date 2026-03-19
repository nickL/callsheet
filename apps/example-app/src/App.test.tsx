import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByTestId('featured-call-scope').textContent).toBe(
      'films.list',
    );
    expect(screen.getByTestId('film-call-scope').textContent).toBe(
      'films.detail',
    );
    expect(screen.getByTestId('featured-count').textContent).toBe('2');
    expect(screen.getByTestId('user-name').textContent).toBe('Nick');
    expect(screen.getByTestId('selected-film').textContent).toBe('Wall-E');

    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh featured films' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('featured-count').textContent).toBe('3');
    });

    expect(screen.getByText('Soul')).toBeTruthy();
  });
});
