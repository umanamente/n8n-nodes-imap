// uncomment if Greenmail tests are failing due to Greenmail container instability
// process.env.SKIP_GREENMAIL_TESTS = 'true';

// uncomment to enable Greenmail debug logs
// process.env.DEBUG_GREENMAIL = 'true';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,
  roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
  testMatch: ['**/tests/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  collectCoverageFrom: [
    'credentials/**/*.ts',
    'nodes/**/*.ts',
    '!nodes/Imap/utils/BetaReleaseNotice.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '[\\\\/]scripts[\\\\/]',
    '[\\\\/]nodes[\\\\/]Imap[\\\\/]utils[\\\\/]BetaReleaseNotice\\.ts$',
    '\\.d\\.ts$',
    //'\\.credentials\\.ts$',
    //'\\.node\\.ts$'
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary', 'lcov', 'html', ['text', { file: 'coverage.txt' }]],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  projects: [
    {
      displayName: 'WithGreenmail',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
      testMatch: ['**/test/WithGreenmail/**/*.test.ts'],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      globalSetup: '<rootDir>/test/WithGreenmail/globalSetup.ts',
      globalTeardown: '<rootDir>/test/WithGreenmail/globalTeardown.ts',
      setupFilesAfterEnv: ['<rootDir>/test/WithGreenmail/setup.withGreenmail.ts'],
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.test.json',
          },
        ],
      },
    },
    {
      displayName: 'WithImapflowMock',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
      testMatch: ['**/test/WithImapflowMock/**/*.test.ts'],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      setupFilesAfterEnv: ['<rootDir>/test/WithImapflowMock/setup.ts'],
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.test.json',
          },
        ],
      },
    },
    {
      displayName: 'UnitTests',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
      testMatch: ['**/test/UnitTests/**/*.test.ts'],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      testPathIgnorePatterns: [],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.test.json',
          },
        ],
      },
    },
    {
      displayName: 'DebugMode',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
      testMatch: ['**/test/UnitTests/**/*.test.ts', '**/test/WithImapflowMock/**/*.test.ts'],
      testPathIgnorePatterns: [
        // debug mode suppresses errors, so ignore tests that expect errors
        '[\\\\/]test[\\\\/]UnitTests[\\\\/]ImapNodeExceptions\\.test\\.ts$',
      ],
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      setupFilesAfterEnv: [
        '<rootDir>/test/setup.withDebug.ts',
        '<rootDir>/test/WithImapflowMock/setup.ts',
      ],
      transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.test.json',
          },
        ],
      },
    },
  ],
};
