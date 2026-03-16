import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineCalls, query } from 'callsheet';

const queryClient = new QueryClient();

const calls = defineCalls({
  status: query({
    state: 'ready',
  }),
} as const);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>Callsheet</h1>
        <p>Example app shell is ready.</p>
        <p data-testid="call-kind">{calls.status.kind}</p>
        <p data-testid="call-state">{calls.status.state}</p>
      </main>
    </QueryClientProvider>
  );
}
