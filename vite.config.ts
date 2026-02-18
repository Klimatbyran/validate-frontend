import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// https://vitejs.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy screenshots API directly
      "/api/screenshots": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            console.warn(
              "Backend server not available on port 3000. Screenshots API will not work.",
            );
            if (res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Backend server not available",
                  message: "Please start the backend server on port 3000",
                }),
              );
            }
          });
        },
      },
      // Auth API endpoints - must come before /api to match first
      "/api/auth": {
        //target: "http://localhost:3000", // Local auth API
        target: "https://stage.klimatkollen.se", // Local auth API
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            console.warn(
              "Auth API server not available on port 3000. Check if local auth API is running.",
            );
            if (res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Auth API server not available",
                  message:
                    "Please start the local auth API server on port 3000",
                }),
              );
            }
          });
        },
      },
      // Other /api calls (pipeline API)
      "/api": {
        target: "https://stage-pipeline-api.klimatkollen.se",
        //target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        timeout: 30000, // Increase timeout to 30 seconds
        proxyTimeout: 30000, // Increase proxy timeout to 30 seconds
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            console.warn(
              "Pipeline API server not available at https://stage-pipeline-api.klimatkollen.se. Queue API will not work.",
            );
            if (res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Pipeline API server not available",
                  message:
                    "Pipeline API server at https://stage-pipeline-api.klimatkollen.se is not reachable",
                  queues: [],
                  jobs: [],
                  stats: { total: 0, active: 0, completed: 0, failed: 0 },
                }),
              );
            }
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // Add custom headers
            proxyReq.setHeader("Connection", "keep-alive");
            proxyReq.setHeader("Keep-Alive", "timeout=30");
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            // Log successful responses
            console.log(
              `API call successful: ${req.method} ${req.url} -> ${proxyRes.statusCode}`,
            );
          });
        },
      },
      // Public Klimatkollen API for company data (prod)
      "/kkapi": {
        target: "https://api.klimatkollen.se",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/kkapi/, "/api"),
        timeout: 30000,
        proxyTimeout: 30000,
      },
      // Stage Klimatkollen API for company data (stage)
      "/stagekkapi": {
        target: "https://stage-api.klimatkollen.se",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/stagekkapi/, ""),
        timeout: 30000,
        proxyTimeout: 30000,
      },
      // Auth API proxy (for development)
      "/authapi": {
        //target: "http://localhost:3000", // Local auth API - adjust port if needed
        // For staging auth API, use:
        target: "https://stage.klimatkollen.se",
        changeOrigin: true,
        secure: false, // Set to false for localhost
        rewrite: (path) => path.replace(/^\/authapi/, ""), // Remove /authapi prefix
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, res) => {
            console.warn(
              "Auth API server not available on port 3000. Check if local auth API is running.",
            );
            if (res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Auth API server not available",
                  message:
                    "Please start the local auth API server on port 3000",
                }),
              );
            }
          });
        },
      },
    },
  },
});
