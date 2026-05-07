import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
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
