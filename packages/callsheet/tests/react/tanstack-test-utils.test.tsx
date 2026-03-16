// @vitest-environment jsdom

import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createTestQueryClient } from './tanstack-test-utils';

import type { PropsWithChildren } from 'react';

function SmokeQuery() {
  const query = useQuery({
    queryFn: () => Promise.resolve('adapter-ready'),
    queryKey: ['tanstack-test-utils', 'smoke'],
  });

  return <div>{query.data ?? 'loading'}</div>;
}

describe('createTestQueryClient', () => {
  it('sets up query client', async () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<SmokeQuery />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('adapter-ready')).toBeTruthy();
    });

    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(Infinity);
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
