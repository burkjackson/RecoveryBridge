import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Mirrors the `@/*` -> `./*` path alias in tsconfig.json. Without this, any
// module under test that uses the project's own `@/lib/...` import convention
// fails to resolve under vitest, even though it compiles and builds fine.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
