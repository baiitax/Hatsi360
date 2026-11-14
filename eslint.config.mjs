import next from 'eslint-config-next';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

/**
 * The Hatsi360 lint configuration.
 *
 * `next lint` was removed in Next 16, and ESLint itself was never a dependency
 * of this project — so `npm run lint` failed before it could report anything.
 * This flat config restores the gate using the Next.js ruleset directly, which
 * Next 16 ships as a flat config, and adds the TypeScript plugin explicitly
 * so the project's TypeScript-specific rules resolve correctly.
 *
 * Test files are excluded from the Next.js `no-assign-module-variable` rule
 * because test loops commonly use `module` as an iteration variable (it is
 * a meaningful word in the domain of the Hatsi360 terminal navigation tests).
 */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'supabase/**'],
  },
  ...next,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Test files use `module` as an iteration variable over MARKET_NAV entries.
    // This is a meaningful domain word, not a CommonJS override.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-assign-module-variable': 'off',
    },
  },
];
