// ESLint 9 flat config for InvisiQ.
// Real gate (replaces the previously non-functional `eslint --ext` script):
//  - typescript-eslint recommended (non-type-checked → fast, no project graph)
//  - react-hooks rules of hooks (error) + exhaustive-deps (warn)
//  - unused vars are already a hard ERROR via tsconfig noUnusedLocals/Parameters;
//    here they're a WARN with an `_`-prefix escape hatch to avoid double-failing.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'dist/**',
      'release/**',
      'release-test*/**',
      'node_modules/**',
      'native/**',
      'scripts/**',
      '*.config.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty catch is an intentional pattern in a few places (best-effort cleanup);
      // flag truly-empty non-catch blocks but allow `catch {}`.
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
);
