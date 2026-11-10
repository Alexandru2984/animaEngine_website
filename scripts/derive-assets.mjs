#!/usr/bin/env node
// @ts-check
/**
 * Makes the derived files the site needs from site-assets/, which stays
 * untouched. The outputs are committed, so a normal build needs no ffmpeg.
 *
 *   public/            files that need a stable URL: favicon, icons, web
 *                      manifest, the link-preview image
 *   src/assets/derived 720p H.264 versions of the clips, for browsers that
 *                      cannot play the WebM (VP9) ones; the provided MP4s
 *                      are 1080p and about twice the size
 *
 * Everything else (screenshots, posters, characters) is imported from
 * site-assets/ directly and optimised by Astro at build time.
 *
 * Usage: node scripts/derive-assets.mjs [--force]
 */
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'site-assets');
const force = process.argv.includes('--force');

/** [source in site-assets, destination relative to the project root] */
const COPIES = [
  ['icons/favicon.ico', 'public/favicon.ico'],
  ['icons/icon.svg', 'public/icons/icon.svg'],
  ['icons/apple-touch-icon.png', 'public/icons/apple-touch-icon.png'],
  ['icons/icon-192.png', 'public/icons/icon-192.png'],
  ['icons/icon-512.png', 'public/icons/icon-512.png'],
  ['icons/icon-maskable-512.png', 'public/icons/icon-maskable-512.png'],
  ['icons/site.webmanifest', 'public/icons/site.webmanifest'],
  ['social/og.png', 'public/social/og.png'],
];

const CLIPS = ['desktop', 'tap', 'pickup', 'sleep'];

/** @param {string} file */
async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} file */
async function kib(file) {
  return `${((await stat(file)).size / 1024).toFixed(0)} KiB`;
}

async function main() {
  for (const [from, to] of COPIES) {
    if (!from || !to) continue;
    const dest = path.join(ROOT, to);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(path.join(SRC, from), dest);
    console.log(`copied  ${from} -> ${to}`);
  }

  const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (ffmpeg.status !== 0) {
    console.error('ffmpeg not found: skipping the 720p MP4 derivatives (the committed ones stay in place).');
    return;
  }

  const outDir = path.join(ROOT, 'src/assets/derived/clips');
  await mkdir(outDir, { recursive: true });
  for (const clip of CLIPS) {
    const input = path.join(SRC, 'clips', `${clip}.mp4`);
    const output = path.join(outDir, `${clip}-720p.mp4`);
    if (!force && (await exists(output))) {
      console.log(`kept    ${path.relative(ROOT, output)} (use --force to redo)`);
      continue;
    }
    // H.264 High@4.0 (avc1.640028), yuv420p and +faststart: plays in every browser that plays
    // MP4, and starts before the whole file has arrived. No audio track.
    const result = spawnSync(
      'ffmpeg',
      [
        '-y', '-loglevel', 'error', '-i', input,
        '-vf', 'scale=1280:720:flags=lanczos:out_range=tv,format=yuv420p', '-color_range', 'tv',
        '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-pix_fmt', 'yuv420p',
        '-preset', 'veryslow', '-crf', '27', '-tune', 'animation',
        '-movflags', '+faststart', '-an', '-map_metadata', '-1',
        output,
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) throw new Error(`ffmpeg failed for ${clip}`);
    console.log(`encoded ${path.relative(ROOT, output)} (${await kib(output)}, source ${await kib(input)})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
