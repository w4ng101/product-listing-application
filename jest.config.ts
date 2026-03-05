/**
 * Jest configuration for the Next.js web project.
 *
 * Uses next/jest to handle the SWC transform, CSS module stubs, and
 * path aliases that match tsconfig.json.
 *
 * All stress tests live under __tests__/ and use the Node environment,
 * so no jsdom or React renderer is needed — the domain / infrastructure /
 * resilience layers are pure TypeScript.
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  // Default to the Node environment — most tests exercise pure domain logic.
  testEnvironment: 'node',

  // Resolve "@/…" imports the same way tsconfig.json does.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/__tests__/**/*.test.tsx',
  ],

  // Exclude the mobile sub-project — it has its own jest-expo config.
  testPathIgnorePatterns: ['/node_modules/', '/mobile/'],

  // Show individual test names in the output.
  verbose: true,
};

export default createJestConfig(config);
