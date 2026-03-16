import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders shell - smoke test', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Callsheet' })).toBeTruthy();
    expect(screen.getByTestId('call-kind').textContent).toBe('query');
    expect(screen.getByTestId('call-state').textContent).toBe('ready');
  });
});
