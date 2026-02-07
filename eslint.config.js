import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: [
      'web/',
      'node_modules/',
      'dist/',
      'drizzle/migrations/',
      '.wrangler/',
      'assets/',
      'clients/',
      '.emoji-cache/',
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

      // Zod .any() for OpenAPI, Hono route handlers
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow empty catch blocks (used intentionally for KV ops, background tasks)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Side-effect OpenAPI registrations, chained builder patterns
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // admin.ts uses require() for lazy loading
  {
    files: ['src/routes/admin.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Type declaration files don't need unused-import checks
  {
    files: ['**/*.d.ts'],
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
);
