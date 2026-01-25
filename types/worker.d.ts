/**
 * Cloudflare Workers types for this project
 */

export interface Env {
  kv: KVNamespace;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
