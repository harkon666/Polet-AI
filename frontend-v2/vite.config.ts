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
    },
  },
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
