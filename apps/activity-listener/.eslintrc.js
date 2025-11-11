module.exports = {
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  extends: ['onionfi'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    'import/no-cycle': 'off',
    'no-plusplus': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/test/**', '**/*.test.ts'],
      },
    ],
  },
};
