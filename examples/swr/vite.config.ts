import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@callsheet/swr': fileURLToPath(
        new URL('../../packages/callsheet-swr/src/index.ts', import.meta.url),
      ),
      '@callsheet/ts-rest': fileURLToPath(
        new URL(
          '../../packages/callsheet-ts-rest/src/index.ts',
          import.meta.url,
        ),
      ),
      '@callsheet/core/swr': fileURLToPath(
        new URL('../../packages/callsheet/src/swr/index.ts', import.meta.url),
      ),
      '@callsheet/core/ts-rest': fileURLToPath(
        new URL(
          '../../packages/callsheet/src/ts-rest/index.ts',
          import.meta.url,
        ),
      ),
      '@callsheet/core': fileURLToPath(
        new URL('../../packages/callsheet/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
