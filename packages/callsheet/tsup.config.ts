import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/react-query/index.ts'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  target: 'es2023',
});
