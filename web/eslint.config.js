import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'build/',
      '.react-router/',
      '.wrangler/',
      'worker-configuration.d.ts',
      'scripts/**/*.cjs',
    ],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Disable base rules to avoid double-reporting with unused-imports plugin
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Auto-fixable: removes unused import statements
      'unused-imports/no-unused-imports': 'error',

      // Reports unused variables (excluding imports handled above)
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // React components, Hono handlers, etc.
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Chained builder patterns, side-effect expressions
      '@typescript-eslint/no-unused-expressions': 'off',

      // Empty interfaces extending a supertype are used for API type stubs
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Type declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
);
