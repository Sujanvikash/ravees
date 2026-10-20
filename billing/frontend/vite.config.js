import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Port 5174 so it can run next to the website's dev server (5173).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  // The whole product list (~2,900 products) ships inside the app, so the bundle is bigger than Vite's
  // 500 kB hint. That is fine for a counter screen that loads once a day.
  build: { chunkSizeWarningLimit: 900 },
})
