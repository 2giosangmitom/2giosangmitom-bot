import { defineConfig } from 'vitest/config';
import tsconfig from './tsconfig.json' with { type: 'json' };
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: ['verbose']
  },
  resolve: {
    // Create alias from tsconfig.json
    alias: Object.fromEntries(
      Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => {
        return [key.replace('/*', ''), path.resolve(import.meta.dirname, value.replace('/*', ''))];
      })
    )
  }
});
