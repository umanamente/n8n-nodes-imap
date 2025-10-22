
// uncomment if Greenmail tests are failing due to Greenmail container instability
// process.env.SKIP_GREENMAIL_TESTS = 'true';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/credentials', '<rootDir>/nodes'],
  testMatch: [
    '**/tests/**/*.ts', 
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  collectCoverageFrom: [
    'credentials/**/*.ts',
    'nodes/**/*.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '\\.d\\.ts$',
    //'\\.credentials\\.ts$',
    //'\\.node\\.ts$'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  projects: [
    {
      displayName: 'WithGreenmail',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/WithGreenmail/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/WithGreenmail/setup.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
    {
      displayName: 'WithImapflowMock',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/WithImapflowMock/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/WithImapflowMock/setup.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
    {
      displayName: 'Other',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/credentials/**/*.test.ts', '<rootDir>/nodes/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/', 
        '/test/WithGreenmail/', 
        '/test/WithImapflowMock/'
      ],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
  ],
};
