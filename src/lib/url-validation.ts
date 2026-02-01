/**
 * URL Validation for Webhook Endpoints — SSRF Prevention
 *
 * Provides defense-in-depth URL validation for webhook target URLs.
 * Note: wrangler.toml already has `global_fetch_strictly_public` compatibility
 * flag for runtime SSRF protection, but this module provides clear error
 * messages and an additional validation layer.
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

export interface UrlValidationOptions {
  allowHttp?: boolean;
}

/**
 * Common internal/database ports that should never be targeted by webhooks.
 */
const BLOCKED_PORTS = new Set([
  6379, // Redis
  6380, // Redis (TLS)
  27017, // MongoDB
  27018, // MongoDB
  27019, // MongoDB
  5432, // PostgreSQL
  3306, // MySQL
  1433, // MSSQL
  1434, // MSSQL Browser
  9200, // Elasticsearch
  9300, // Elasticsearch
  5984, // CouchDB
  8529, // ArangoDB
  7474, // Neo4j
  7687, // Neo4j Bolt
  2379, // etcd
  2380, // etcd
  8500, // Consul
  8600, // Consul DNS
  11211, // Memcached
  9042, // Cassandra
  15672, // RabbitMQ Management
  5672, // RabbitMQ
  4369, // Erlang Port Mapper
  25, // SMTP
  587, // SMTP (submission)
  465, // SMTPS
  22, // SSH
  23, // Telnet
  3389, // RDP
  445, // SMB
  139, // NetBIOS
  135, // MSRPC
]);

/**
 * Check if a hostname looks like a private/internal IPv4 address.
 */
function isPrivateIPv4(hostname: string): boolean {
  // Match dotted-quad IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (!match) return false;

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  // Validate each octet is in range
  if (octets.some((o) => o < 0 || o > 255)) return false;

  const [a, b] = octets;

  // 10.0.0.0/8 — Private
  if (a === 10) return true;

  // 172.16.0.0/12 — Private
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 — Private
  if (a === 192 && b === 168) return true;

  // 127.0.0.0/8 — Loopback
  if (a === 127) return true;

  // 169.254.0.0/16 — Link-local (includes cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8 — Current network
  if (a === 0) return true;

  return false;
}

/**
 * Check if a hostname is an IPv6 address that should be blocked.
 * Handles both bare IPv6 and bracket-wrapped [::1] forms.
 */
function isBlockedIPv6(hostname: string): boolean {
  // Strip brackets if present (URL-style IPv6)
  const addr = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // Must look like IPv6 (contains colons)
  if (!addr.includes(':')) return false;

  // Loopback ::1
  if (addr === '::1') return true;

  // Unspecified ::
  if (addr === '::') return true;

  // Link-local fe80::/10
  if (addr.startsWith('fe80:') || addr.startsWith('fe80')) return true;

  // Unique local fc00::/7 (fc00:: and fd00::)
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x) — check the embedded IPv4 (dotted-quad form)
  const v4MappedMatch = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4MappedMatch && isPrivateIPv4(v4MappedMatch[1])) return true;

  // IPv4-mapped IPv6 in hex form (::ffff:7f00:1) — URL parsers normalize dotted-quad to hex
  const v4MappedHexMatch = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (v4MappedHexMatch) {
    const high = parseInt(v4MappedHexMatch[1], 16);
    const low = parseInt(v4MappedHexMatch[2], 16);
    const reconstructed = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    if (isPrivateIPv4(reconstructed)) return true;
  }

  return false;
}

/**
 * Validate a URL intended for use as a webhook delivery target.
 *
 * Checks for:
 * - Well-formed URL structure
 * - HTTPS requirement (unless allowHttp is set)
 * - Private/internal IP addresses
 * - Localhost and loopback addresses
 * - Cloud metadata endpoints (169.254.169.254)
 * - IPv6 link-local and loopback addresses
 * - Common internal service ports (databases, message queues, etc.)
 */
export function validateWebhookUrl(
  urlString: string,
  opts?: UrlValidationOptions,
): UrlValidationResult {
  // --- Parse URL ---
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // --- Protocol check ---
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { valid: false, error: 'URL must use HTTPS (or HTTP if explicitly allowed)' };
  }

  if (url.protocol === 'http:' && !opts?.allowHttp) {
    return { valid: false, error: 'URL must use HTTPS. HTTP is not allowed for webhook endpoints' };
  }

  // --- Hostname must be present ---
  const hostname = url.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: 'URL must include a hostname' };
  }

  // --- Userinfo (user:pass@host) is suspicious ---
  if (url.username || url.password) {
    return { valid: false, error: 'URL must not contain credentials (user:password@)' };
  }

  // --- Localhost check ---
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
    return { valid: false, error: 'Webhook URLs must not target localhost' };
  }

  // --- Private IPv4 check ---
  if (isPrivateIPv4(hostname)) {
    return {
      valid: false,
      error: 'Webhook URLs must not target private or internal IP addresses',
    };
  }

  // --- Blocked IPv6 check ---
  if (isBlockedIPv6(hostname)) {
    return {
      valid: false,
      error: 'Webhook URLs must not target loopback, link-local, or private IPv6 addresses',
    };
  }

  // --- Cloud metadata endpoint ---
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return {
      valid: false,
      error: 'Webhook URLs must not target cloud metadata endpoints',
    };
  }

  // --- Blocked ports ---
  const port = url.port ? parseInt(url.port, 10) : null;
  if (port !== null && BLOCKED_PORTS.has(port)) {
    return {
      valid: false,
      error: `Port ${port} is not allowed for webhook endpoints (commonly used by internal services)`,
    };
  }

  return { valid: true };
}
