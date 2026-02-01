#!/usr/bin/env node

/**
 * generate-icons.js - Generate PWA icon PNGs for Tampa.dev
 *
 * Creates properly-sized PNG icons from scratch using only Node.js built-in
 * modules. The icons feature a coral (#F97066) background with a white "T"
 * letterform representing the Tampa.dev brand.
 *
 * Generated files (saved to web/public/icons/):
 *   - icon-192.png       (192x192, with rounded corners)
 *   - icon-512.png       (512x512, with rounded corners)
 *   - icon-512-maskable.png (512x512, full bleed for maskable use)
 *   - apple-touch-icon.png  (180x180, full bleed - iOS applies its own mask)
 *
 * Usage:
 *   node web/scripts/generate-icons.js
 *
 * No external dependencies required.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Brand colors
const CORAL = { r: 249, g: 112, b: 102 }; // #F97066
const WHITE = { r: 255, g: 255, b: 255 };
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

// Output directory
const OUT_DIR = path.resolve(__dirname, "..", "public", "icons");

/**
 * Create a raw RGBA pixel buffer for a given size, filled with transparent pixels.
 */
function createBuffer(width, height) {
  const buf = Buffer.alloc(width * height * 4, 0);
  return buf;
}

/**
 * Set a pixel in the RGBA buffer.
 */
function setPixel(buf, width, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= width) return;
  const offset = (y * width + x) * 4;
  buf[offset] = r;
  buf[offset + 1] = g;
  buf[offset + 2] = b;
  buf[offset + 3] = a;
}

/**
 * Fill a rectangle.
 */
function fillRect(buf, width, height, x0, y0, w, h, color, alpha = 255) {
  for (let y = y0; y < y0 + h && y < height; y++) {
    for (let x = x0; x < x0 + w && x < width; x++) {
      setPixel(buf, width, x, y, color.r, color.g, color.b, alpha);
    }
  }
}

/**
 * Fill the buffer with a rounded rectangle.
 */
function fillRoundedRect(buf, size, radius, color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = false;

      // Check if the pixel is inside the rounded rectangle
      if (x >= radius && x < size - radius) {
        inside = true;
      } else if (y >= radius && y < size - radius) {
        inside = true;
      } else {
        // Check corner circles
        let cx, cy;
        if (x < radius && y < radius) {
          cx = radius;
          cy = radius;
        } else if (x >= size - radius && y < radius) {
          cx = size - radius;
          cy = radius;
        } else if (x < radius && y >= size - radius) {
          cx = radius;
          cy = size - radius;
        } else {
          cx = size - radius;
          cy = size - radius;
        }
        const dx = x - cx;
        const dy = y - cy;
        inside = dx * dx + dy * dy <= radius * radius;
      }

      if (inside) {
        setPixel(buf, size, x, y, color.r, color.g, color.b, 255);
      }
    }
  }
}

/**
 * Draw a filled circle (used for the dot in "T.")
 */
function fillCircle(buf, width, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(buf, width, x, y, color.r, color.g, color.b, 255);
      }
    }
  }
}

/**
 * Draw the "T" letterform at the given position and size.
 * This draws a simple block "T" shape using filled rectangles.
 */
function drawT(buf, size, cx, cy, letterHeight, color) {
  // The T consists of a horizontal top bar and a vertical stem.
  const barWidth = Math.round(letterHeight * 0.75);
  const barHeight = Math.round(letterHeight * 0.16);
  const stemWidth = Math.round(letterHeight * 0.22);
  const stemHeight = letterHeight - barHeight;

  // Top bar
  const barX = Math.round(cx - barWidth / 2);
  const barY = Math.round(cy - letterHeight / 2);
  fillRect(buf, size, size, barX, barY, barWidth, barHeight, color);

  // Vertical stem
  const stemX = Math.round(cx - stemWidth / 2);
  const stemY = barY + barHeight;
  fillRect(buf, size, size, stemX, stemY, stemWidth, stemHeight, color);
}

/**
 * Draw a dot (period) to the right of and below the T.
 */
function drawDot(buf, size, cx, cy, dotRadius, color) {
  fillCircle(buf, size, cx, cy, dotRadius, color);
}

/**
 * Encode an RGBA buffer as a PNG file using only Node.js built-in modules.
 *
 * PNG format:
 *   - 8-byte signature
 *   - IHDR chunk (width, height, bit depth, color type, etc.)
 *   - IDAT chunk(s) (zlib-compressed filtered scanlines)
 *   - IEND chunk
 */
function encodePNG(buf, width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Create IHDR data
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Create raw scanline data with filter bytes
  // Each scanline: 1 filter byte + width * 4 bytes
  const rawDataSize = height * (1 + width * 4);
  const rawData = Buffer.alloc(rawDataSize);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (1 + width * 4);
    rawData[scanlineOffset] = 0; // filter type: None

    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = scanlineOffset + 1 + x * 4;
      rawData[dstOffset] = buf[srcOffset]; // R
      rawData[dstOffset + 1] = buf[srcOffset + 1]; // G
      rawData[dstOffset + 2] = buf[srcOffset + 2]; // B
      rawData[dstOffset + 3] = buf[srcOffset + 3]; // A
    }
  }

  // Compress with zlib
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Create a PNG chunk: 4-byte length + 4-byte type + data + 4-byte CRC.
 */
function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcInput);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * CRC-32 implementation for PNG chunk checksums.
 */
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Generate an icon with the given parameters.
 */
function generateIcon({ size, rounded, maskable, filename }) {
  console.log(`Generating ${filename} (${size}x${size})...`);

  const buf = createBuffer(size, size);

  if (rounded) {
    // Rounded corners - radius is ~16% of size
    const radius = Math.round(size * 0.16);
    fillRoundedRect(buf, size, radius, CORAL);
  } else {
    // Full bleed (maskable or apple touch icon)
    fillRect(buf, size, size, 0, 0, size, size, CORAL);
  }

  // Draw "T" letter
  // For maskable icons, the safe zone is the inner 80%, so scale the letter down
  let letterHeight, centerY, centerX;
  if (maskable) {
    letterHeight = Math.round(size * 0.42);
    centerX = Math.round(size * 0.47);
    centerY = Math.round(size * 0.48);
  } else {
    letterHeight = Math.round(size * 0.52);
    centerX = Math.round(size * 0.47);
    centerY = Math.round(size * 0.47);
  }

  drawT(buf, size, centerX, centerY, letterHeight, WHITE);

  // Draw the dot "."
  const dotRadius = Math.round(letterHeight * 0.06);
  const dotX = Math.round(centerX + letterHeight * 0.30);
  const dotY = Math.round(centerY + letterHeight * 0.38);
  drawDot(buf, size, dotX, dotY, dotRadius, WHITE);

  // Encode to PNG
  const png = encodePNG(buf, size, size);

  // Write file
  const filepath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filepath, png);
  console.log(`  -> ${filepath} (${png.length} bytes)`);
}

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Generate all icons
const icons = [
  { size: 192, rounded: true, maskable: false, filename: "icon-192.png" },
  { size: 512, rounded: true, maskable: false, filename: "icon-512.png" },
  {
    size: 512,
    rounded: false,
    maskable: true,
    filename: "icon-512-maskable.png",
  },
  {
    size: 180,
    rounded: false,
    maskable: false,
    filename: "apple-touch-icon.png",
  },
];

console.log("Generating Tampa.dev PWA icons...");
console.log(`Output directory: ${OUT_DIR}\n`);

for (const icon of icons) {
  generateIcon(icon);
}

console.log("\nDone! All icons generated successfully.");
console.log(
  "\nNote: These are programmatically generated placeholder icons using pixel",
);
console.log(
  "manipulation. For production-quality icons, consider using the SVG source",
);
console.log(
  "files in the same directory with a tool like Inkscape, librsvg, or sharp:",
);
console.log("  npx sharp-cli -i web/public/icons/icon-512.svg -o web/public/icons/icon-512.png -w 512 -h 512");
