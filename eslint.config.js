// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["dist", "node_modules", "coverage"],
  },
  {
    rules: {
      'prettier/prettier': 'off', // We are using prettier for formatting, not for linting
    }
  }
);
