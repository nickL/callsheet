import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      callsheet: fileURLToPath(
        new URL('../../packages/callsheet/src/index.ts', import.meta.url),
      ),
      'callsheet/react-query': fileURLToPath(
        new URL(
          '../../packages/callsheet/src/react-query/index.ts',
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
