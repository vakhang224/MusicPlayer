// eslint.config.js (ESLint v9)
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', 'build/**'],
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': 'error',
    },
    ignores: ['node_modules/**', 'build/**', 'ios/**', 'android/**', 'assets/**', 'bin/**', 'fastlane/**', 'kotlin/providers/**', 'vendored/**', 'docs/public/static/**'],
    settings: {},
  },
  prettier,
];
