import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'

function geojsonPlugin() {
  return {
    name: 'geojson-loader',
    transform(code: string, id: string) {
      if (id.endsWith('.geojson')) {
        return {
          code: `export default ${code};`,
          map: null,
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [geojsonPlugin(), react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
