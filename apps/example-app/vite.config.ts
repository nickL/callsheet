import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'callsheet/react-query': fileURLToPath(
        new URL(
          '../../packages/callsheet/src/react-query/index.ts',
          import.meta.url,
        ),
      ),
      'callsheet/ts-rest': fileURLToPath(
        new URL(
          '../../packages/callsheet/src/ts-rest/index.ts',
          import.meta.url,
        ),
      ),
      callsheet: fileURLToPath(
        new URL('../../packages/callsheet/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
