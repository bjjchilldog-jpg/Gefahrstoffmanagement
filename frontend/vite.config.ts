import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Connect } from 'vite'
import fs from 'fs'
import path from 'path'

// Custom SPA fallback middleware (workaround for Vite 4.x + strictPort bug)
function spaFallback(): { name: string; configureServer: (server: any) => void } {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req: Connect.IncomingMessage, res: any, next: Connect.NextFunction) => {
        const url = req.url || '/'
        // Skip assets, API calls, and Vite internals
        if (
          url.startsWith('/@') ||
          url.startsWith('/node_modules') ||
          url.startsWith('/src') ||
          url.startsWith('/api') ||
          url.includes('.') 
        ) {
          return next()
        }
        // Serve index.html for all other routes (SPA fallback)
        const indexPath = path.resolve(__dirname, 'index.html')
        if (fs.existsSync(indexPath)) {
          req.url = '/index.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gefahrstoff-Management',
        short_name: 'Gefahrstoff',
        description: 'Plattform für Gefahrstoff- und Biostoffmanagement',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
  }
})
