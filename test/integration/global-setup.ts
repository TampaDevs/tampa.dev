/**
 * Miniflare Singleton
 *
 * Lazily creates a Miniflare instance with D1, KV, and R2 bindings,
 * applies all Drizzle migrations, and caches the result for reuse
 * across all test files in the same process.
 */

import { Miniflare } from 'miniflare';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

declare global {
   
  var __TEST_ENV__: {
    DB: D1Database;
    kv: KVNamespace;
    OAUTH_KV: KVNamespace;
    UPLOADS_BUCKET: R2Bucket;
  };
}

let mf: Miniflare | null = null;

export async function initMiniflare() {
  if (mf) return; // Already initialized

  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    d1Databases: { DB: 'test-db' },
    kvNamespaces: { kv: 'test-kv', OAUTH_KV: 'test-oauth-kv' },
    r2Buckets: { UPLOADS_BUCKET: 'test-uploads' },
  });

  // Get bindings
  const DB = await mf.getD1Database('DB');
  const kv = await mf.getKVNamespace('kv');
  const OAUTH_KV = await mf.getKVNamespace('OAUTH_KV');
  const UPLOADS_BUCKET = await mf.getR2Bucket('UPLOADS_BUCKET');

  // Apply migrations in order
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(thisDir, '../..');
  const journalPath = path.join(projectRoot, 'drizzle/migrations/meta/_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

  for (const entry of journal.entries) {
    const sqlFile = path.join(projectRoot, 'drizzle/migrations', `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    // Strip Drizzle breakpoint markers and split into individual statements
    const cleanedSql = sqlContent.replace(/--> statement-breakpoint/g, '');
    const statements = cleanedSql
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      try {
        await DB.prepare(stmt).run();
      } catch (err) {
        // Some migrations may have IF NOT EXISTS or may conflict; log and continue
        console.warn(`Migration warning (${entry.tag}): ${(err as Error).message}`);
      }
    }
  }

  // Store on globalThis for access in test helpers
  globalThis.__TEST_ENV__ = { DB, kv, OAUTH_KV, UPLOADS_BUCKET };
}

export async function disposeMiniflare() {
  if (mf) {
    await mf.dispose();
    mf = null;
  }
}
