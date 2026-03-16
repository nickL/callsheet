import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineCalls, query } from 'callsheet';

const queryClient = new QueryClient();

const calls = defineCalls({
  status: query({
    dataKey: ['status'],
  }),
} as const);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>Callsheet</h1>
        <p>Example app shell is ready.</p>
        <p data-testid="call-kind">{calls.status.kind}</p>
        <p data-testid="call-data-key">
          {Array.isArray(calls.status.dataKey)
            ? calls.status.dataKey.join('.')
            : 'dynamic'}
        </p>
      </main>
    </QueryClientProvider>
  );
}
