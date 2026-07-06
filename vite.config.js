/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '')
      },
    },
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 7', 'iOS >= 12'],
      modernPolyfills: true,
    }),
  ],
  base: '/cycleflow2/',
  build: {
    target: 'es2015',
  },
})
