import { defineConfig } from 'eslint/config'
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.claude/**',
      'out/**',
      'build/**',
      'public/sw.js',
      'scripts/**',
      'docs/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Apostrophes/quotes in JSX copy are fine; this rule is noise for a
      // prose-heavy app (158 hits at time of adoption).
      'react/no-unescaped-entities': 'off',
      // Downgrade while the existing `any`s (mostly Supabase payloads) are
      // cleaned up incrementally; new code should still avoid them.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // CommonJS config files legitimately use require()
    files: ['**/*.config.js', '**/*.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])
