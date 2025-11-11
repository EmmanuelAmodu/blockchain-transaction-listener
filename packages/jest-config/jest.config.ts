import type { Config } from 'jest';

const baseConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  rootDir: 'src',
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../../coverage',
  testPathIgnorePatterns: ['<rootDir>/dist'],
  testEnvironment: 'node',
  forceExit: true,
  reporters: [
    ['github-actions', { silent: false }],
    process.env.CI ? 'summary' : 'default',
  ],
};

export default baseConfig;
