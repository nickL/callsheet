import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: ['@callsheet/core', '@callsheet/core/react-query'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  target: 'es2023',
});
