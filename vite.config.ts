import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GARBO_PROD_API, GARBO_STAGE_API } from "./src/config/api-env";

// https://vitejs.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pipeline URLs and garbo "on this machine" backend. Garbo stage/prod from api-env. */
const URLS_BY_TARGET = {
  pipeline: {
    local: "http://localhost:3001",
    stage: "https://stage-pipeline-api.klimatkollen.se",
    prod: "https://pipeline-api.klimatkollen.se",
  },
  /** Garbo backend when target is local (garbo running on this machine, e.g. localhost:3000). */
  garboBackendLocal: "http://localhost:3000",
} as const;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "") || url;
}

function targetFromEnv(env: Record<string, string>, key: string, joint: string): "local" | "stage" | "prod" {
  const v = env[key] || env.VITE_API_MODE || joint;
  return v === "local" || v === "prod" ? v : "stage";
}

/** Resolve proxy targets from pipeline target and garbo target (joint or overrides). */
function getProxyTargets(env: Record<string, string>) {
  const joint = env.VITE_API_MODE || "stage";
  const pipelineTarget = targetFromEnv(env, "VITE_PIPELINE_TARGET", joint);
  const garboTarget = targetFromEnv(env, "VITE_GARBO_TARGET", joint);

  return {
    pipelineTarget,
    garboTarget,
    pipelineLocal: normalizeUrl(env.VITE_PIPELINE_API_URL ?? URLS_BY_TARGET.pipeline.local),
    pipelineStage: normalizeUrl(env.VITE_PIPELINE_STAGE_URL ?? URLS_BY_TARGET.pipeline.stage),
    pipelineProd: normalizeUrl(env.VITE_PIPELINE_PROD_URL ?? URLS_BY_TARGET.pipeline.prod),
    screenshots: normalizeUrl(env.VITE_SCREENSHOTS_API_URL ?? "http://localhost:3000"),
    garboProd: normalizeUrl(env.VITE_GARBO_PROD_URL ?? GARBO_PROD_API),
    garboStage: normalizeUrl(env.VITE_GARBO_STAGE_URL ?? GARBO_STAGE_API),
    garboBackendLocal: normalizeUrl(env.VITE_GARBO_LOCAL_URL ?? URLS_BY_TARGET.garboBackendLocal),
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

function pipelineProxyConfigure(targetUrl: string) {
  return (proxy: any, _options: any) => {
    proxy.on("error", (_err: any, _req: any, res: any) => {
      if (res && typeof res.writeHead === "function" && !res.headersSent) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Pipeline API not available",
            message: `Pipeline not reachable at ${targetUrl}`,
            queues: [],
            jobs: [],
            stats: { total: 0, active: 0, completed: 0, failed: 0 },
          }),
        );
      }
    });
    proxy.on("proxyReq", (proxyReq: any) => {
      proxyReq.setHeader("Connection", "keep-alive");
      proxyReq.setHeader("Keep-Alive", "timeout=30");
    });
    proxy.on("proxyRes", (proxyRes: any, req: any) => {
      console.log(`API: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
    });
  };
}

// Proxy targets: .env.development or .env.development.example.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const urls = getProxyTargets(env);
  if (mode === "development") {
    const pipelineUrl = urls.pipelineTarget === "local" ? urls.pipelineLocal : urls.pipelineTarget === "prod" ? urls.pipelineProd : urls.pipelineStage;
    console.log("[vite] pipeline target:", urls.pipelineTarget, "->", pipelineUrl);
    console.log("[vite] garbo target:", urls.garboTarget, "->", urls.garboStage, urls.garboProd, urls.garboBackendLocal);
  }

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
        // More specific first: pipeline paths so network tab shows which backend (local, stage, prod)
        "/pipeline-local": {
          target: urls.pipelineLocal,
          changeOrigin: true,
          secure: !urls.pipelineLocal.startsWith("http://"),
          rewrite: (path) => "/api" + path.replace(/^\/pipeline-local/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: pipelineProxyConfigure(urls.pipelineLocal),
        },
        "/pipeline-stage": {
          target: urls.pipelineStage,
          changeOrigin: true,
          secure: !urls.pipelineStage.startsWith("http://"),
          rewrite: (path) => "/api" + path.replace(/^\/pipeline-stage/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: pipelineProxyConfigure(urls.pipelineStage),
        },
        "/pipeline": {
          target: urls.pipelineProd,
          changeOrigin: true,
          secure: !urls.pipelineProd.startsWith("http://"),
          rewrite: (path) => "/api" + path.replace(/^\/pipeline/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: pipelineProxyConfigure(urls.pipelineProd),
        },
        // More specific first: /garbo-stage and /garbo-local (this machine) then /garbo (prod)
        "/garbo-stage": {
          target: urls.garboStage,
          changeOrigin: true,
          secure: !urls.garboStage.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/garbo-stage/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
        "/garbo-local": {
          target: urls.garboBackendLocal,
          changeOrigin: true,
          secure: !urls.garboBackendLocal.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/garbo-local/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
        "/garbo": {
          target: urls.garboProd,
          changeOrigin: true,
          secure: !urls.garboProd.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/garbo/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
      },
    },
  };
});
