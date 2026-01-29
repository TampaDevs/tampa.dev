import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
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

export default defineConfig({
  plugins: [
    devCsrfBypass(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  define: {
    // Inject EVENTS_API_URL at build/dev time for SSR
    "import.meta.env.EVENTS_API_URL": JSON.stringify(
      process.env.EVENTS_API_URL || ""
    ),
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
