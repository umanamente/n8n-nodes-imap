
// uncomment if Greenmail tests are failing due to Greenmail container instability
// process.env.SKIP_GREENMAIL_TESTS = 'true';

// uncomment to enable Greenmail debug logs
// process.env.DEBUG_GREENMAIL = 'true';


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
  coverageReporters: [
    'json-summary', 
    'lcov', 
    'html',
    ['text', { file: 'coverage.txt' }],
  ],
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
      maxWorkers: 1, // Force serial execution for GreenMail tests
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
      displayName: 'UnitTests',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/UnitTests/**/*.test.ts'],
      testPathIgnorePatterns: [
      ],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    },
    {
      displayName: 'DebugMode',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/test/UnitTests/**/*.test.ts',
        '<rootDir>/test/WithImapflowMock/**/*.test.ts',
      ],
      testPathIgnorePatterns: [
        // debug mode suppresses errors, so ignore tests that expect errors
        '<rootDir>/test/UnitTests/ImapNodeExceptions.test.ts',
      ],      
      setupFilesAfterEnv: [
        '<rootDir>/test/setup.withDebug.ts',
        '<rootDir>/test/WithImapflowMock/setup.ts',
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
    }
  ],
};
