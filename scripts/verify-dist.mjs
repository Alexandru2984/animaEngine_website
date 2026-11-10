#!/usr/bin/env node
// @ts-check
/**
 * Checks the production build in dist/ before it is deployed:
 *
 *  - every internal link, image, video, script and stylesheet resolves to a
 *    file, and every #fragment to an element id on the target page;
 *  - no file exceeds Cloudflare Workers Static Assets' 25 MiB limit, and the
 *    file count stays far below the 20,000 limit;
 *  - nothing would be blocked by the Content-Security-Policy in _headers
 *    (no inline scripts, inline styles, style attributes or off-site assets);
 *  - every page has one <h1>, a title, a description, a canonical URL and
 *    Open Graph data; sitemap entries exist;
 *  - every file under /_astro/ is referenced somewhere (no dead weight).
 *
 * Usage: node scripts/verify-dist.mjs   (after `npm run build`)
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://animaengine.eu';
const MAX_FILE = 25 * 1024 * 1024;
const MAX_FILES = 20_000;

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];
const fail = (/** @type {string} */ msg) => errors.push(msg);

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/** "/docs/" -> "docs/index.html"; "/x.png" -> "x.png". */
function toFile(/** @type {string} */ urlPath) {
  let p = decodeURIComponent(urlPath.split(/[?#]/)[0] ?? '');
  if (p.endsWith('/')) p += 'index.html';
  return p.replace(/^\//, '');
}

/** @param {string} html */
function ids(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

/** @param {string} html @returns {string[]} */
function references(html) {
  const refs = [];
  // Ignore the contents of <template>, <code> and non-executed JSON data blocks
  // only where they hold text; URLs inside JSON are checked separately.
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]*)"/g)) refs.push(m[1] ?? '');
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) {
    for (const part of (m[1] ?? '').split(',')) refs.push(part.trim().split(/\s+/)[0] ?? '');
  }
  return refs.filter((r) => r !== '');
}

async function main() {
  try {
    await stat(DIST);
  } catch {
    console.error('dist/ not found: run `npm run build` first.');
    process.exit(1);
  }

  const files = await walk(DIST);
  const rel = files.map((f) => path.relative(DIST, f).split(path.sep).join('/'));
  const fileSet = new Set(rel);

  // Sizes and counts.
  let total = 0;
  for (const f of files) {
    const { size } = await stat(f);
    total += size;
    if (size > MAX_FILE) fail(`${path.relative(DIST, f)} is ${(size / 1048576).toFixed(1)} MiB (limit 25 MiB)`);
  }
  if (files.length > MAX_FILES) fail(`${files.length} files (limit ${MAX_FILES})`);
  for (const required of ['_headers', 'robots.txt', 'sitemap.xml', '404.html', 'index.html', 'favicon.ico']) {
    if (!fileSet.has(required)) fail(`missing ${required}`);
  }
  if (rel.some((f) => f.startsWith('site-assets/'))) fail('site-assets/ was copied into dist/');

  const htmlFiles = rel.filter((f) => f.endsWith('.html'));
  /** @type {Map<string, string>} */
  const pages = new Map();
  for (const f of htmlFiles) pages.set(f, await readFile(path.join(DIST, f), 'utf8'));
  const cssFiles = rel.filter((f) => f.endsWith('.css'));
  /** @type {Map<string, string>} */
  const styles = new Map();
  for (const f of cssFiles) styles.set(f, await readFile(path.join(DIST, f), 'utf8'));

  /** Text in which /_astro/ files may be referenced (HTML, CSS, JS, JSON blocks). */
  let corpus = [...pages.values(), ...styles.values()].join('\n');
  for (const f of rel.filter((x) => x.endsWith('.js') || x.endsWith('.webmanifest'))) {
    corpus += '\n' + (await readFile(path.join(DIST, f), 'utf8'));
  }

  let linkCount = 0;
  for (const [file, html] of pages) {
    const where = `/${file.replace(/index\.html$/, '')}`;

    // CSP compatibility.
    for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
      const attrs = m[1] ?? '';
      if (/\bsrc=/.test(attrs)) continue;
      if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
      fail(`${where}: inline <script${attrs}> would be blocked by script-src 'self'`);
    }
    if (/<style[\s>]/.test(html)) fail(`${where}: inline <style> would be blocked by style-src 'self'`);
    if (/\sstyle="/.test(html)) fail(`${where}: style="" attribute would be blocked by style-src 'self'`);
    if (/\son[a-z]+="/.test(html)) fail(`${where}: inline event handler attribute`);

    // SEO basics.
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1s !== 1) fail(`${where}: ${h1s} <h1> elements (expected 1)`);
    if (!/<html lang="en"/.test(html)) fail(`${where}: missing <html lang>`);
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
    if (title.trim() === '') fail(`${where}: empty <title>`);
    if (!/<meta name="description" content="[^"]{50,}"/.test(html)) fail(`${where}: missing or short meta description`);
    if (!/<meta property="og:image" content="https:\/\/animaengine\.eu\//.test(html)) fail(`${where}: missing og:image`);
    if (file === '404.html') {
      if (!/<meta name="robots" content="noindex"/.test(html)) fail('404 page is indexable');
    } else {
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
      const expected = `${SITE}/${file.replace(/index\.html$/, '')}`;
      if (canonical !== expected) fail(`${where}: canonical ${canonical} (expected ${expected})`);
    }

    // Links and assets.
    for (const ref of references(html)) {
      if (/^(mailto:|tel:|data:)/.test(ref)) {
        if (ref.startsWith('data:')) fail(`${where}: data: URI would be blocked by img-src 'self'`);
        continue;
      }
      if (/^https?:\/\//.test(ref)) {
        const url = new URL(ref);
        const isLink = new RegExp(`href="${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html);
        if (!isLink && url.origin !== SITE) fail(`${where}: off-site asset ${ref} would be blocked by the CSP`);
        if (url.protocol !== 'https:') fail(`${where}: insecure link ${ref}`);
        continue;
      }
      if (ref.startsWith('//')) {
        fail(`${where}: protocol-relative URL ${ref}`);
        continue;
      }
      linkCount++;
      const [pathPart, fragment] = ref.split('#');
      const targetFile = pathPart === '' ? file : toFile(new URL(pathPart ?? '', `${SITE}${where}`).pathname);
      if (!fileSet.has(targetFile)) {
        fail(`${where}: broken reference ${ref}`);
        continue;
      }
      if (fragment) {
        const targetHtml = pages.get(targetFile);
        if (targetHtml && !ids(targetHtml).has(decodeURIComponent(fragment))) fail(`${where}: missing anchor ${ref}`);
      }
    }

    // URLs inside JSON data blocks (character explorer, download picker).
    for (const m of html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
      for (const u of (m[1] ?? '').matchAll(/"(\/_astro\/[^"]+)"/g)) {
        if (!fileSet.has(toFile(u[1] ?? ''))) fail(`${where}: JSON references missing ${u[1]}`);
      }
    }

    // A link that opens a new browsing context must not hand it window.opener.
    for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
      if (!/rel="[^"]*noopener/.test(m[0])) fail(`${where}: target=_blank without rel=noopener: ${m[0].slice(0, 120)}`);
    }
  }

  // CSS url() references.
  for (const [file, css] of styles) {
    for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const ref = m[1] ?? '';
      if (ref.startsWith('data:')) fail(`${file}: data: URI in CSS would be blocked by the CSP`);
      else if (/^https?:/.test(ref)) fail(`${file}: off-site asset ${ref}`);
      else if (!fileSet.has(toFile(new URL(ref, `${SITE}/${file}`).pathname))) fail(`${file}: broken url(${ref})`);
    }
  }

  // Sitemap entries must exist and use the canonical host.
  const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE}/`)) fail(`sitemap: ${loc} is not on ${SITE}`);
    else if (!fileSet.has(toFile(new URL(loc).pathname))) fail(`sitemap: ${loc} has no page`);
  }
  for (const page of htmlFiles) {
    if (page === '404.html') continue;
    if (!locs.includes(`${SITE}/${page.replace(/index\.html$/, '')}`)) warnings.push(`sitemap: /${page} is not listed`);
  }

  // Unreferenced build files.
  for (const f of rel.filter((x) => x.startsWith('_astro/'))) {
    if (!corpus.includes(path.posix.basename(f))) warnings.push(`unreferenced build file: ${f}`);
  }

  console.log(`dist/: ${files.length} files, ${(total / 1048576).toFixed(1)} MiB, ${htmlFiles.length} pages, ${linkCount} internal references checked.`);
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`verify-dist: ${errors.length} problem(s).`);
    process.exit(1);
  }
  console.log('verify-dist: all checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
