module.exports = {
  extends: ['eslint-config-prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
  },
  rules: {
    'no-console': 'off',
    'max-classes-per-file': 'off',
  },
};
