/**
 * Creates white-on-green app icons from the original Plotra logo.
 *
 *   adaptive-icon.png  → white silhouette, transparent background
 *   icon.png           → white silhouette, #1c5c2c solid background
 *
 * Strategy (no manual pixel loops):
 *   1. Grayscale + negate → dark logo pixels become bright, white bg becomes 0
 *   2. threshold(30)      → binary: logo=255, background=0
 *   3. joinChannel        → add binary mask as alpha to a white RGB image
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS = path.join(__dirname, 'assets');
const ORIG   = path.join(ASSETS, 'adaptive-icon-original.png');
const BG     = { r: 28, g: 92, b: 44 };

async function run() {
  const { width, height } = await sharp(ORIG).metadata();
  console.log(`Source: ${width}×${height}`);

  // ── 1. Build binary alpha mask: logo pixels=255, background=0 ─────────────
  // Order matters: threshold(200) first → background(255)=255, logo(dark)=0
  // then negate → background=0 (transparent), logo=255 (opaque)
  const alphaMask = await sharp(ORIG)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .threshold(200)   // bg (≥200) → 255; dark logo (<200) → 0
    .negate()         // flip: bg → 0 (transparent), logo → 255 (opaque)
    .raw()
    .toBuffer();

  // ── 2. White RGB base (all channels = 255) ──────────────────────────────────
  const whiteBase = Buffer.alloc(width * height * 3, 255);

  // ── 3. Join: white RGB + alpha mask = white RGBA silhouette ─────────────────
  const silhouettePng = await sharp(whiteBase, { raw: { width, height, channels: 3 } })
    .joinChannel(alphaMask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  // ── 4. Save adaptive-icon.png (transparent background) ────────────────────
  await sharp(silhouettePng).png().toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png  — white logo, transparent bg');

  // ── 5. Save icon.png (dark-green background) ──────────────────────────────
  const greenBg = await sharp({
    create: { width, height, channels: 4, background: { ...BG, alpha: 255 } },
  }).png().toBuffer();

  await sharp(greenBg)
    .composite([{ input: silhouettePng, blend: 'over' }])
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png           — white logo, #1c5c2c bg');

  console.log('\nDone — rebuild the APK to pick up the new icons.');
}

run().catch(e => { console.error(e); process.exit(1); });
