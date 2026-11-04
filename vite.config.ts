import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: {
    include: ['tests/**/*.test.ts', 'scratch/**/*.test.ts'],
    environment: 'node',
    // (One built city per worker, shared by its test files: the city takes a minute to build and most files walk it.)
    isolate: false,
    passWithNoTests: true,
    // The sim tests walk and climb the whole city: minutes on the slower CI machines (CI is set there). One limit
    // here, none per test.
    testTimeout: process.env.CI ? 900_000 : 300_000,
    hookTimeout: process.env.CI ? 900_000 : 300_000,
  },
});
