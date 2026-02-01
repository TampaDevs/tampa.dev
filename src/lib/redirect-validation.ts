/**
 * OAuth Redirect URL Validation
 *
 * Prevents open-redirect vulnerabilities in the OAuth/login flow by
 * validating return-to URLs and presenting an interstitial consent page
 * for untrusted external destinations.
 */

export interface RedirectResult {
  url: string;
  trusted: boolean;
}

/**
 * HTML-escape a string to prevent XSS when embedding in HTML.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Extract the hostname from a URL string, returning null if it cannot be parsed.
 */
function getHostname(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if a hostname is trusted for automatic redirects.
 *
 * Trusted hosts:
 * - Any subdomain of tampa.dev (e.g. events.tampa.dev, api.tampa.dev)
 * - tampa.dev itself
 * - localhost (for local development)
 */
function isTrustedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // Exact match for tampa.dev
  if (h === 'tampa.dev') return true;

  // Subdomains of tampa.dev
  if (h.endsWith('.tampa.dev')) return true;

  // localhost for development
  if (h === 'localhost') return true;

  return false;
}

/**
 * Validate a return_to / redirect URL from an OAuth or login flow.
 *
 * - If returnTo is null, undefined, or empty, returns the fallback (trusted).
 * - Relative paths (starting with `/`) are trusted and returned as-is.
 * - Absolute URLs on *.tampa.dev or localhost are trusted.
 * - All other URLs are untrusted (the caller should show an interstitial).
 */
export function validateReturnTo(
  returnTo: string | null | undefined,
  fallback: string,
): RedirectResult {
  // No return_to provided — use fallback
  if (!returnTo || returnTo.trim() === '') {
    return { url: fallback, trusted: true };
  }

  const trimmed = returnTo.trim();

  // Relative path — trusted (same origin)
  // Guard against protocol-relative URLs (//evil.com) which browsers resolve as absolute
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { url: trimmed, trusted: true };
  }

  // Block dangerous URI schemes (javascript:, data:, vbscript:) that could
  // be rendered as clickable links in the interstitial page
  const schemeLower = trimmed.toLowerCase();
  if (schemeLower.startsWith('javascript:') || schemeLower.startsWith('data:') || schemeLower.startsWith('vbscript:')) {
    return { url: fallback, trusted: true };
  }

  // Absolute URL — check the host
  const hostname = getHostname(trimmed);
  if (hostname && isTrustedHost(hostname)) {
    return { url: trimmed, trusted: true };
  }

  // Everything else is untrusted
  return { url: trimmed, trusted: false };
}

/**
 * Render an HTML interstitial page for untrusted redirect targets.
 *
 * Displayed when a user is about to be redirected to an external site
 * that is not in the trusted domain list. The page shows the target URL
 * and requires explicit user consent before navigating.
 *
 * All dynamic content is HTML-escaped to prevent XSS.
 */
export function renderRedirectInterstitial(targetUrl: string): string {
  const safeUrl = escapeHtml(targetUrl);

  let displayDomain: string;
  try {
    const parsed = new URL(targetUrl);
    displayDomain = escapeHtml(parsed.hostname);
  } catch {
    displayDomain = safeUrl;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Leaving Tampa.dev</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      color: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      max-width: 480px;
      width: 100%;
      padding: 2rem;
      text-align: center;
    }
    .icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .description {
      color: #555;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .url-display {
      background: #f1f3f5;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      word-break: break-all;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.85rem;
      color: #495057;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn-continue {
      display: inline-block;
      background: #228be6;
      color: #fff;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      transition: background 0.15s;
    }
    .btn-continue:hover { background: #1c7ed6; }
    .btn-back {
      display: inline-block;
      color: #868e96;
      text-decoration: none;
      font-size: 0.875rem;
    }
    .btn-back:hover { color: #495057; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon" aria-hidden="true">&#x1F6AA;</div>
    <h1>You are leaving Tampa.dev</h1>
    <p class="description">
      You are about to be redirected to an external website. Please verify
      the URL below before continuing.
    </p>
    <div class="url-display">${safeUrl}</div>
    <div class="actions">
      <a class="btn-continue" href="${safeUrl}" rel="noopener noreferrer">Continue to ${displayDomain}</a>
      <a class="btn-back" href="https://events.tampa.dev">Go to Tampa.dev</a>
    </div>
  </div>
</body>
</html>`;
}
