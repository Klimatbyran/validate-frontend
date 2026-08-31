/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  GARBO_PROD_API,
  GARBO_STAGE_API,
  UNEARTH_PROD_API,
  UNEARTH_STAGE_API,
} from "./src/config/api-env";

// https://vitejs.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URLS_BY_TARGET = {
  pipeline: {
    local: "http://localhost:3001",
    stage: "https://stage-pipeline-api.klimatkollen.se",
    prod: "https://pipeline-api.klimatkollen.se",
  },
  unearthLocal: "http://localhost:3000",
  garboLocal: "http://localhost:3002",
} as const;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "") || url;
}

function targetFromEnv(
  env: Record<string, string>,
  key: string,
  joint: string,
): "local" | "stage" | "prod" {
  const v = env[key] || env.VITE_API_MODE || joint;
  return v === "local" || v === "prod" ? v : "stage";
}

function unearthTargetFromEnv(
  env: Record<string, string>,
  joint: string,
): "local" | "stage" | "prod" {
  const v =
    env.VITE_UNEARTH_TARGET ||
    env.VITE_GARBO_TARGET ||
    env.VITE_API_MODE ||
    joint;
  return v === "local" || v === "prod" ? v : "stage";
}

function garboArchiveTargetFromEnv(
  env: Record<string, string>,
  joint: string,
): "local" | "stage" | "prod" {
  const v = env.VITE_GARBO_ARCHIVE_TARGET;
  if (v === "local" || v === "stage" || v === "prod") return v;
  return unearthTargetFromEnv(env, joint);
}

/** Resolve proxy targets from env (joint mode or per-service overrides). */
function getProxyTargets(env: Record<string, string>) {
  const joint = env.VITE_API_MODE || "stage";
  const pipelineTarget = targetFromEnv(env, "VITE_PIPELINE_TARGET", joint);
  const unearthTarget = unearthTargetFromEnv(env, joint);
  const garboArchiveTarget = garboArchiveTargetFromEnv(env, joint);

  return {
    pipelineTarget,
    unearthTarget,
    garboArchiveTarget,
    pipelineLocal: normalizeUrl(
      env.VITE_PIPELINE_API_URL ?? URLS_BY_TARGET.pipeline.local,
    ),
    pipelineStage: normalizeUrl(
      env.VITE_PIPELINE_STAGE_URL ?? URLS_BY_TARGET.pipeline.stage,
    ),
    pipelineProd: normalizeUrl(
      env.VITE_PIPELINE_PROD_URL ?? URLS_BY_TARGET.pipeline.prod,
    ),
    screenshots: normalizeUrl(
      env.VITE_SCREENSHOTS_API_URL ?? "http://localhost:3000",
    ),
    unearthStage: normalizeUrl(env.VITE_UNEARTH_STAGE_URL ?? UNEARTH_STAGE_API),
    unearthProd: normalizeUrl(env.VITE_UNEARTH_PROD_URL ?? UNEARTH_PROD_API),
    garboStage: normalizeUrl(env.VITE_GARBO_STAGE_URL ?? GARBO_STAGE_API),
    garboProd: normalizeUrl(env.VITE_GARBO_PROD_URL ?? GARBO_PROD_API),
    unearthLocal: normalizeUrl(
      env.VITE_UNEARTH_LOCAL_URL ?? URLS_BY_TARGET.unearthLocal,
    ),
    garboLocal: normalizeUrl(
      env.VITE_GARBO_LOCAL_URL ?? URLS_BY_TARGET.garboLocal,
    ),
  };
}

// Vite plugin that auto-generates climate-plans/index.json
// by scanning public/climate-plans/ subfolders for JSON files.
// Just drop a folder with plan_scope_*.json and emission_targets_*.json
// and it gets picked up automatically.
function climatePlansManifest(): Plugin {
  const climatePlansDir = path.resolve(__dirname, "public/climate-plans");

  const generateManifest = () => {
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
  };

  return {
    name: "climate-plans-manifest",
    buildStart() {
      generateManifest();
    },
    configureServer(server) {
      // Regenerate when files change in the climate-plans directory
      server.watcher.on("all", (_event, filePath) => {
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
/** Overview / internal Unearth routes — aggregation can be slow until SQL pagination lands. */
const UNEARTH_PROXY_TIMEOUT_MS = 600000;

function pipelineProxyConfigure(targetUrl: string) {
  return (proxy: any, _options: any) => {
    void _options;
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

function setProxyApiKey(
  proxyReq: { setHeader: (n: string, v: string) => void },
  key: string | undefined,
) {
  if (key) {
    proxyReq.setHeader("X-API-Key", key);
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const urls = getProxyTargets(env);
  if (mode === "development") {
    const pipelineUrl =
      urls.pipelineTarget === "local"
        ? urls.pipelineLocal
        : urls.pipelineTarget === "prod"
          ? urls.pipelineProd
          : urls.pipelineStage;
    console.log(
      "[vite] pipeline target:",
      urls.pipelineTarget,
      "->",
      pipelineUrl,
    );
    console.log(
      "[vite] unearth target:",
      urls.unearthTarget,
      "->",
      urls.unearthTarget === "local"
        ? urls.unearthLocal
        : urls.unearthTarget === "prod"
          ? urls.unearthProd
          : urls.unearthStage,
    );
    console.log(
      "[vite] garbo (queue-archive) target:",
      urls.garboArchiveTarget,
      "->",
      urls.garboArchiveTarget === "local"
        ? urls.garboLocal
        : urls.garboArchiveTarget === "prod"
          ? urls.garboProd
          : urls.garboStage,
    );
  }

  return {
    plugins: [react(), climatePlansManifest()],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: true,
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
            void _options;
            proxy.on("error", (_err, _req, res) => {
              console.warn(
                `Screenshots API not available at ${urls.screenshots}. Screenshots will not work.`,
              );
              if (res && "headersSent" in res && !res.headersSent) {
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
        // Pipeline proxies (most specific paths first)
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
        "/pipeline-stage-api": {
          target: urls.pipelineStage,
          changeOrigin: true,
          secure: !urls.pipelineStage.startsWith("http://"),
          rewrite: (path) => "/api" + path.replace(/^\/pipeline-stage-api/, ""),
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
        "/garbo-stage/api/queue-archive": {
          target: urls.garboStage,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/garbo-stage/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              setProxyApiKey(proxyReq, env.GARBO_STAGE_ALL_ACCESS_API_KEY);
            });
          },
        },
        "/garbo-stage-api/queue-archive": {
          target: urls.garboStage,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/garbo-stage-api/, "/api"),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              setProxyApiKey(proxyReq, env.GARBO_STAGE_ALL_ACCESS_API_KEY);
            });
          },
        },
        "/garbo/api/queue-archive": {
          target: urls.garboProd,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/garbo/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              setProxyApiKey(proxyReq, env.GARBO_PROD_ALL_ACCESS_API_KEY);
            });
          },
        },
        "/garbo-local/api/queue-archive": {
          target: urls.garboLocal,
          changeOrigin: true,
          secure: !urls.garboLocal.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/garbo-local/, ""),
          timeout: PROXY_TIMEOUT_MS,
          proxyTimeout: PROXY_TIMEOUT_MS,
        },
        "/unearth-stage": {
          target: urls.unearthStage,
          changeOrigin: true,
          secure: !urls.unearthStage.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/unearth-stage/, ""),
          timeout: UNEARTH_PROXY_TIMEOUT_MS,
          proxyTimeout: UNEARTH_PROXY_TIMEOUT_MS,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              setProxyApiKey(proxyReq, env.GARBO_STAGE_ALL_ACCESS_API_KEY);
            });
          },
        },
        "/unearth-local": {
          target: urls.unearthLocal,
          changeOrigin: true,
          secure: !urls.unearthLocal.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/unearth-local/, ""),
          timeout: UNEARTH_PROXY_TIMEOUT_MS,
          proxyTimeout: UNEARTH_PROXY_TIMEOUT_MS,
        },
        "/unearth": {
          target: urls.unearthProd,
          changeOrigin: true,
          secure: !urls.unearthProd.startsWith("http://"),
          rewrite: (path) => path.replace(/^\/unearth/, ""),
          timeout: UNEARTH_PROXY_TIMEOUT_MS,
          proxyTimeout: UNEARTH_PROXY_TIMEOUT_MS,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              setProxyApiKey(proxyReq, env.GARBO_PROD_ALL_ACCESS_API_KEY);
            });
          },
        },
      },
    },
  };
});
