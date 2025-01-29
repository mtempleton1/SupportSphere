/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'core/**/*.ts',
    '!core/**/*.d.ts',
    '!core/**/index.ts',
  ],
  testMatch: [
    '<rootDir>/**/*.test.ts'
  ],
  setupFiles: ['<rootDir>/test/setup.js']
}; 