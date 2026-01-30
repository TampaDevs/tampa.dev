import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";

// Check if local HTTPS certs exist
const certsPath = path.resolve(__dirname, "../certs");
const certFile = path.join(certsPath, "tampa.dev+5.pem");
const keyFile = path.join(certsPath, "tampa.dev+5-key.pem");
const hasLocalCerts = fs.existsSync(certFile) && fs.existsSync(keyFile);

/**
 * Development plugin to fix CSRF issues with custom hostnames.
 * React Router checks that host header matches origin header for action requests.
 * With custom dev hostnames (tampa.dev, etc.), these can mismatch.
 *
 * Note: For logout specifically, we use native form.submit() to bypass
 * React Router's single-fetch CSRF check entirely.
 */
function devCsrfBypass(): Plugin {
  return {
    name: "dev-csrf-bypass",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // In development, normalize host header to match origin for action requests
        const origin = req.headers.origin;
        if (origin) {
          try {
            const originUrl = new URL(origin);
            req.headers.host = originUrl.host;
          } catch {
            // Invalid URL, let it pass through
          }
        }
        next();
      });
    },
  };
}

const noMinify = !!process.env.NO_MINIFY;

export default defineConfig({
  plugins: [
    devCsrfBypass(),
    mdx({
      jsxImportSource: "react",
      remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    minify: noMinify ? false : "esbuild",
  },
  define: {
    // Inject EVENTS_API_URL at build/dev time for SSR
    "import.meta.env.EVENTS_API_URL": JSON.stringify(
      process.env.EVENTS_API_URL || ""
    ),
    // Force React development mode for full error messages in debug builds
    ...(noMinify
      ? { "process.env.NODE_ENV": JSON.stringify("development") }
      : {}),
  },
  server: {
    // Proxy /api requests to the local API server
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
    // HTTPS config if local certs exist
    ...(hasLocalCerts
      ? {
          https: {
            cert: certFile,
            key: keyFile,
          },
          host: "0.0.0.0",
          port: 5173,
        }
      : {}),
  },
});
