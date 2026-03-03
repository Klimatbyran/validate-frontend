import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// https://vitejs.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default API base URLs by mode when env vars are not set. */
const DEFAULT_URLS = {
  stage: {
    pipeline: "https://stage-pipeline-api.klimatkollen.se",
    auth: "https://stage.klimatkollen.se",
  },
  prod: {
    pipeline: "https://pipeline-api.klimatkollen.se",
    auth: "https://api.klimatkollen.se",
  },
  local: {
    pipeline: "http://localhost:3001",
    auth: "http://localhost:3000",
  },
  screenshots: "http://localhost:3000",
  kkApi: "https://api.klimatkollen.se",
  kkStageApi: "https://stage-api.klimatkollen.se",
} as const;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "") || url;
}

/** Resolve proxy targets: VITE_API_MODE (local|stage|prod) or per-URL env overrides. */
function getProxyTargets(env: Record<string, string>) {
  const mode = (env.VITE_API_MODE || "stage") as "local" | "stage" | "prod";
  const modeDefaults =
    mode === "local"
      ? DEFAULT_URLS.local
      : mode === "prod"
        ? DEFAULT_URLS.prod
        : DEFAULT_URLS.stage;

  return {
    pipeline: normalizeUrl(
      env.VITE_PIPELINE_API_URL ?? modeDefaults.pipeline,
    ),
    auth: normalizeUrl(env.VITE_AUTH_API_URL ?? modeDefaults.auth),
    screenshots: normalizeUrl(
      env.VITE_SCREENSHOTS_API_URL ?? DEFAULT_URLS.screenshots,
    ),
    kkApi: normalizeUrl(env.VITE_KK_API_URL ?? DEFAULT_URLS.kkApi),
    kkStageApi: normalizeUrl(
      env.VITE_KK_STAGE_API_URL ?? DEFAULT_URLS.kkStageApi,
    ),
  };
}

// Vite plugin that auto-generates climate-plans/index.json
// by scanning public/climate-plans/ subfolders for JSON files.
// Just drop a folder with plan_scope_*.json and emission_targets_*.json
// and it gets picked up automatically.
function climatePlansManifest(): Plugin {
  const climatePlansDir = path.resolve(__dirname, "public/climate-plans");

  function generateManifest() {
    if (!fs.existsSync(climatePlansDir)) {
      fs.mkdirSync(climatePlansDir, { recursive: true });
      fs.writeFileSync(
        path.join(climatePlansDir, "index.json"),
        JSON.stringify({ municipalities: [] }, null, 2) + "\n",
      );
      return;
    }

    const entries = fs.readdirSync(climatePlansDir, { withFileTypes: true });
    const municipalities = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folder = entry.name;
      const folderPath = path.join(climatePlansDir, folder);
      const files = fs.readdirSync(folderPath);

      const planScope = files.find(
        (f) => f.startsWith("plan_scope") && f.endsWith(".json"),
      );
      const emissionTargets = files.find(
        (f) => f.startsWith("emission_targets") && f.endsWith(".json"),
      );

      if (!planScope && !emissionTargets) continue;

      // Derive display name from folder: mullsjo -> Mullsjö, nassjo -> Nässjö
      // Falls back to capitalized folder name
      const name = folder.charAt(0).toUpperCase() + folder.slice(1);

      municipalities.push({
        id: folder,
        name,
        folder,
        files: {
          ...(planScope && { plan_scope: planScope }),
          ...(emissionTargets && { emission_targets: emissionTargets }),
        },
      });
    }

    fs.writeFileSync(
      path.join(climatePlansDir, "index.json"),
      JSON.stringify({ municipalities }, null, 2) + "\n",
    );
  }

  return {
    name: "climate-plans-manifest",
    buildStart() {
      generateManifest();
    },
    configureServer(server) {
      // Regenerate when files change in the climate-plans directory
      server.watcher.on("all", (event, filePath) => {
        if (
          filePath.startsWith(climatePlansDir) &&
          !filePath.endsWith("index.json")
        ) {
          generateManifest();
        }
      });
    },
  };
}

const PROXY_TIMEOUT_MS = 30000;

// Proxy targets are driven by env: set VITE_PIPELINE_API_URL, VITE_AUTH_API_URL, etc.
// See .env.development.example for switching between staging and local backends.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const urls = getProxyTargets(env);

  return {
    plugins: [react(), climatePlansManifest()],
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
        "/api/screenshots": {
          target: urls.screenshots,
          changeOrigin: true,
          secure: false,
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, res) => {
              console.warn(
                `Screenshots API not available at ${urls.screenshots}. Screenshots will not work.`,
              );
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Screenshots API not available",
                    message: `Backend not reachable at ${urls.screenshots}`,
                  }),
                );
              }
            });
          },
        },
        "/api/auth": {
          target: urls.auth,
          changeOrigin: true,
          secure: !urls.auth.startsWith("http://"),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, res) => {
              console.warn(`Auth API not available at ${urls.auth}.`);
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Auth API not available",
                    message: `Auth backend not reachable at ${urls.auth}`,
                  }),
                );
              }
            });
          },
        },
        "/api": {
          target: urls.pipeline,
          changeOrigin: true,
          secure: !urls.pipeline.startsWith("http://"),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, res) => {
              console.warn(`Pipeline API not available at ${urls.pipeline}.`);
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Pipeline API not available",
                    message: `Pipeline API not reachable at ${urls.pipeline}`,
                    queues: [],
                    jobs: [],
                    stats: { total: 0, active: 0, completed: 0, failed: 0 },
                  }),
                );
              }
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              proxyReq.setHeader("Connection", "keep-alive");
              proxyReq.setHeader("Keep-Alive", "timeout=30");
            });
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log(
                `API: ${req.method} ${req.url} -> ${proxyRes.statusCode}`,
              );
            });
          },
        },
        "/kkapi": {
          target: urls.kkApi,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/kkapi/, "/api"),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
        "/stagekkapi": {
          target: urls.kkStageApi,
          changeOrigin: true,
          secure: !urls.kkStageApi.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/stagekkapi/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
        "/authapi": {
          target: urls.auth,
          changeOrigin: true,
          secure: !urls.auth.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/authapi/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, res) => {
              console.warn(`Auth API not available at ${urls.auth}.`);
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Auth API not available",
                    message: `Auth backend not reachable at ${urls.auth}`,
                  }),
                );
              }
            });
          },
        },
      },
    },
  };
});
