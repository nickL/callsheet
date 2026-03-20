import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: ['@callsheet/core/ts-rest'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  target: 'es2023',
});
