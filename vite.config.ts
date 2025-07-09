import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
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
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/admin/queues/api'),
        secure: false,
        timeout: 30000, // Increase timeout to 30 seconds
        proxyTimeout: 30000, // Increase proxy timeout to 30 seconds
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Proxy error handling
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Remove large headers that might cause 431 errors
            proxyReq.removeHeader('Connection');
            proxyReq.removeHeader('Keep-Alive');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Response handling
          });
        }
      },
    },
  },
});