import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '#': resolve(__dirname, './src'),
      '@': resolve(__dirname, './src'),
      '#shared': resolve(__dirname, '../frontend/src'),
      // Force a single React instance ONLY in test mode. The cross-imported
      // `#shared/...` modules would otherwise pull `frontend/node_modules/react`
      // and end up with two React copies (null hooks dispatcher). Aliasing
      // unconditionally breaks SSR module resolution (CJS index.js can't be
      // loaded as ESM via vite's module-runner), so guard on `mode`.
      ...(mode === 'test'
        ? {
            react: resolve(__dirname, 'node_modules/react'),
            'react-dom': resolve(__dirname, 'node_modules/react-dom'),
          }
        : {}),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    server: {
      deps: {
        // Inline the cross-imported #shared module so vitest re-uses our
        // deduped React instead of frontend/node_modules/react.
        inline: [/frontend\/src/],
      },
    },
    deps: {
      optimizer: {
        web: {
          include: ['react', 'react-dom', 'react/jsx-runtime'],
        },
      },
    },
  },
  plugins: mode === 'test'
    ? [viteReact()]
    : [
        devtools(),
        nitro({ rollupConfig: { external: [/^@sentry\//] } }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
      ],
}))

export default config
