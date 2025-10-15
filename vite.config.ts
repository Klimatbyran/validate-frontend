/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
    // Proxy screenshots API directly
    '/api/screenshots': {
      target: 'https://stage-api.klimatkollen.se/',
      changeOrigin: true,
      secure: false,
      timeout: 30000,
      proxyTimeout: 30000,
    },
      // Other /api calls (internal admin UI API)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api/, '/admin/queues/api');
          console.log(`Proxying ${path} → ${newPath}`);
          return newPath;
        },
        secure: false,
        timeout: 30000, // Increase timeout to 30 seconds
        proxyTimeout: 30000, // Increase proxy timeout to 30 seconds
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`Proxying request: ${req.method} ${req.url} → ${proxyReq.getHeader('host')}${proxyReq.path}`);
            // Add custom headers
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Keep-Alive', 'timeout=30');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`Proxy response: ${proxyRes.statusCode} for ${req.url}`);
          });
        }
      },
      // Public Klimatkollen API for company data
      '/kkapi': {
        target: 'https://api.klimatkollen.se',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/kkapi/, '/api'),
        timeout: 30000,
        proxyTimeout: 30000,
      },
        
    },
  },
});