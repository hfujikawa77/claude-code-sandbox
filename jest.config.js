/** @type {import('jest').Config} */
export default {
  // TypeScript and ES modules support
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Paths
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts'
  ],
  
  // TypeScript configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds (80% minimum)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,
  
  // Globals (TypeScript support)
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};