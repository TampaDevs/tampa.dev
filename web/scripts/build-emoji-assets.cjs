#!/usr/bin/env node

/**
 * build-emoji-assets.cjs - Build local Apple emoji assets from emoji-data repo
 *
 * Reads the emoji-data repository (expected at ../emoji-data/ relative to the
 * project root) and:
 *   1. Converts Apple 160px PNG images to WebP (cached in .emoji-cache/)
 *   2. Uploads WebP images to Cloudflare R2
 *   3. Generates web/app/lib/emoji-map.json (codepoint lookup for Emoji component)
 *   4. Generates src/data/emoji-index.json (short_name lookup for API)
 *
 * R2 credentials are read from .dev.vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, UPLOADS_PUBLIC_BUCKET_NAME).
 *
 * Requires: cwebp (install via `brew install webp` or your package manager)
 *
 * Usage:
 *   node web/scripts/build-emoji-assets.cjs
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EMOJI_DATA_DIR = path.resolve(PROJECT_ROOT, '../emoji-data');
const EMOJI_JSON = path.join(EMOJI_DATA_DIR, 'emoji.json');
const IMG_SRC_DIR = path.join(EMOJI_DATA_DIR, 'img-apple-160');
const WEBP_CACHE_DIR = path.join(PROJECT_ROOT, '.emoji-cache');
const EMOJI_MAP_FILE = path.resolve(__dirname, '../app/lib/emoji-map.json');
const EMOJI_INDEX_FILE = path.resolve(PROJECT_ROOT, 'src/data/emoji-index.json');
const DEV_VARS_FILE = path.join(PROJECT_ROOT, '.dev.vars');

// ─── Validate prerequisites ─────────────────────────────────────────────────

if (!fs.existsSync(EMOJI_JSON)) {
  console.error(`emoji.json not found at ${EMOJI_JSON}`);
  console.error('Clone the emoji-data repo to ../emoji-data/ relative to the project root.');
  process.exit(1);
}
if (!fs.existsSync(IMG_SRC_DIR)) {
  console.error(`Apple 160px image directory not found at ${IMG_SRC_DIR}`);
  process.exit(1);
}

try {
  execFileSync('cwebp', ['-version'], { stdio: 'pipe' });
} catch {
  console.error('cwebp not found. Install it via: brew install webp (macOS) or apt-get install webp (Linux)');
  process.exit(1);
}

// ─── Parse .dev.vars for R2 credentials ──────────────────────────────────────

function parseDevVars(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const devVars = parseDevVars(DEV_VARS_FILE);
const R2_ACCOUNT_ID = devVars.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = devVars.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = devVars.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = devVars.UPLOADS_PUBLIC_BUCKET_NAME || 'tampa-dev-uploads-public';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials in .dev.vars. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

// ─── Build emoji assets ──────────────────────────────────────────────────────

console.log('Building Apple emoji assets...');
console.log(`  Source:     ${IMG_SRC_DIR}`);
console.log(`  WebP cache: ${WEBP_CACHE_DIR}`);
console.log(`  R2 bucket:  ${BUCKET_NAME}`);
console.log();

const emojiData = JSON.parse(fs.readFileSync(EMOJI_JSON, 'utf8'));

fs.mkdirSync(WEBP_CACHE_DIR, { recursive: true });

const emojiMap = {};   // normalized codepoints (without fe0f) → filename
const emojiIndex = {}; // short_name → { image, name, category }
const webpFiles = [];  // { filename, localPath } for R2 upload

let convertedCount = 0;
let skippedCount = 0;

/**
 * Normalize a unified codepoint string by removing FE0F variation selectors.
 * Input: "0023-FE0F-20E3" → Output: "0023-20e3"
 */
function normalizeUnified(unified) {
  return unified
    .toLowerCase()
    .split('-')
    .filter(cp => cp !== 'fe0f')
    .join('-');
}

/**
 * Process a single emoji entry: convert its PNG to WebP and add it to lookup maps.
 * Returns the WebP filename if successful, null otherwise.
 */
function processImage(entry) {
  if (!entry.has_img_apple) return null;

  const pngFilename = entry.image;
  const webpFilename = pngFilename.replace(/\.png$/, '.webp');
  const srcFile = path.join(IMG_SRC_DIR, pngFilename);
  const destFile = path.join(WEBP_CACHE_DIR, webpFilename);

  if (!fs.existsSync(srcFile)) {
    skippedCount++;
    return null;
  }

  // Convert PNG to WebP (lossy q90 with full alpha quality), skip if cached
  if (!fs.existsSync(destFile)) {
    execFileSync('cwebp', ['-q', '90', '-alpha_q', '100', srcFile, '-o', destFile], { stdio: 'pipe' });
  }
  convertedCount++;

  webpFiles.push({ filename: webpFilename, localPath: destFile });

  // Add to codepoint map (key: without fe0f, value: actual filename)
  const unified = entry.unified.toLowerCase();
  const normalized = normalizeUnified(entry.unified);

  emojiMap[normalized] = webpFilename;
  if (unified !== normalized) {
    emojiMap[unified] = webpFilename;
  }

  return webpFilename;
}

// Process all emoji
for (const emoji of emojiData) {
  const filename = processImage(emoji);

  if (filename) {
    for (const name of emoji.short_names) {
      emojiIndex[name] = {
        i: filename,
        u: emoji.unified,
        c: emoji.category,
      };
    }

    if (emoji.skin_variations) {
      for (const variant of Object.values(emoji.skin_variations)) {
        processImage(variant);
      }
    }
  }
}

// Write emoji map (for Emoji component - codepoints → filename)
fs.writeFileSync(EMOJI_MAP_FILE, JSON.stringify(emojiMap));
console.log(`Emoji map: ${Object.keys(emojiMap).length} codepoint entries → ${EMOJI_MAP_FILE}`);

// Write emoji index (for API - short_name → metadata)
fs.writeFileSync(EMOJI_INDEX_FILE, JSON.stringify(emojiIndex));
console.log(`Emoji index: ${Object.keys(emojiIndex).length} short_name entries → ${EMOJI_INDEX_FILE}`);

console.log();
console.log(`Converted ${convertedCount} emoji images to WebP (${skippedCount} skipped - no Apple image)`);

// ─── Upload to R2 ────────────────────────────────────────────────────────────

async function uploadToR2() {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const CONCURRENCY = 20;
  let uploaded = 0;
  let alreadyExists = 0;

  console.log(`\nUploading ${webpFiles.length} emoji to R2 (${CONCURRENCY} concurrent)...`);

  async function exists(key) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async function uploadOne({ filename, localPath }) {
    const key = `emoji/${filename}`;

    if (await exists(key)) {
      alreadyExists++;
      return;
    }

    const body = fs.readFileSync(localPath);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    uploaded++;
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < webpFiles.length; i += CONCURRENCY) {
    const batch = webpFiles.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(uploadOne));

    const done = Math.min(i + CONCURRENCY, webpFiles.length);
    process.stdout.write(`\r  Progress: ${done}/${webpFiles.length}`);
  }

  console.log();
  console.log(`  Uploaded: ${uploaded} new, ${alreadyExists} already in R2`);
  console.log('Done!');
}

uploadToR2().catch(err => {
  console.error('R2 upload failed:', err.message);
  process.exit(1);
});
