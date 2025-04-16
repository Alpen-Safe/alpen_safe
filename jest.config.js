module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*?)(\\.js)?$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controller/**/*.ts',
    'model/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}; 