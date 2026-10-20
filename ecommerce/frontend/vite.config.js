import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The hero frames live in public/frames-<id>/ and a new folder is made every time they change
// (scripts/make-frames.mjs), so a given frame URL never changes: browsers can keep it for good.
// Without this the dev server answers "no-cache", and every refresh asks the server about all 150+
// frames again. (A production host needs the same header for /frames-*.)
const cacheHeroFrames = {
  name: 'cache-hero-frames',
  configureServer: (server) => {
    server.middlewares.use(setFrameHeaders)
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(setFrameHeaders)
  },
}
function setFrameHeaders(req, res, next) {
  if (/^\/frames-[^/]+\//.test(req.url ?? '')) {
    const set = res.setHeader.bind(res)
    // Vite's static handler sets its own Cache-Control afterwards; keep ours.
    res.setHeader = (name, value) =>
      set(name, String(name).toLowerCase() === 'cache-control' ? 'public, max-age=31536000, immutable' : value)
  }
  next()
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cacheHeroFrames],
})
