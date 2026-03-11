/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  moduleNameMapper: {
    '^@ordo/types$': '<rootDir>/../types/src/index.ts',
    '^@ordo/types': '<rootDir>/../types/src/index.ts',
    '^@ordo/validations$': '<rootDir>/../validations/src/index.ts',
    '^@ordo/validations': '<rootDir>/../validations/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/ws-client.ts',
    '!src/resources/index.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      functions: 80,
      statements: 80,
    },
  },
};
