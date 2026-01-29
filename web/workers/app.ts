import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

/**
 * Normalize request headers to fix CSRF mismatch in development.
 * React Router checks that Host matches Origin on action requests.
 * With custom dev hostnames, these can mismatch.
 */
function normalizeRequest(request: Request): Request {
  const origin = request.headers.get("Origin");
  if (!origin) return request;

  try {
    const originUrl = new URL(origin);
    const currentHost = request.headers.get("Host");

    // If host already matches origin, no change needed
    if (currentHost === originUrl.host) return request;

    // Create new headers with normalized host
    const headers = new Headers(request.headers);
    headers.set("Host", originUrl.host);

    return new Request(request.url, {
      method: request.method,
      headers,
      body: request.body,
      redirect: request.redirect,
      signal: request.signal,
    });
  } catch {
    return request;
  }
}

export default {
  async fetch(request, env, ctx) {
    // Normalize headers in development to fix CSRF issues
    const normalizedRequest = import.meta.env.DEV
      ? normalizeRequest(request)
      : request;

    return requestHandler(normalizedRequest, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
