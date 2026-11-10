#!/usr/bin/env node
// @ts-check
/**
 * Refreshes the site's release data from the public GitHub Releases API:
 *
 *   src/data/releases.json        downloads, sizes, SHA-256 digests
 *   src/content/changelog/*.md    release notes for /changelog/
 *
 * The site never calls GitHub at runtime; run this after publishing a release,
 * then rebuild and deploy. On any error the existing files are left untouched.
 *
 * Usage: node scripts/sync-releases.mjs [--allow-empty] [--dry-run]
 * Env:   GITHUB_TOKEN (optional) raises the API rate limit from 60 to 5000/h.
 *        ANIMA_REPOSITORY (optional) defaults to Alexandru2984/animaEngine.
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  absolutizeLinks,
  changelogEntry,
  isChecksumsAsset,
  normalizeRelease,
  parseSha256Sums,
  prepareReleaseNotes,
  sortReleases,
} from '../src/lib/release-manifest.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'src/data/releases.json');
const CHANGELOG_DIR = path.join(ROOT, 'src/content/changelog');
const REPOSITORY = process.env.ANIMA_REPOSITORY ?? 'Alexandru2984/animaEngine';
const API = 'https://api.github.com';
const args = new Set(process.argv.slice(2));
const TIMEOUT_MS = 20_000;

class SyncError extends Error {}

/** @returns {Record<string, string>} */
function apiHeaders() {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'animaengine-website-release-sync',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/**
 * @param {string} url
 * @param {Record<string, string>} headers
 */
async function request(url, headers) {
  try {
    return await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyncError(`Network error while fetching ${url}: ${reason}`);
  }
}

/** @param {Response} response */
function describeFailure(response) {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  if ((response.status === 403 || response.status === 429) && remaining === '0') {
    const when = reset ? new Date(Number(reset) * 1000).toISOString() : 'later';
    return `GitHub API rate limit reached; it resets at ${when}. Set GITHUB_TOKEN to raise the limit.`;
  }
  if (response.status === 404) return `Repository ${REPOSITORY} not found, or it has no public releases.`;
  return `GitHub answered ${response.status} ${response.statusText} for ${response.url}`;
}

/**
 * Follows `Link: <…>; rel="next"` pagination.
 * @param {string} firstUrl
 * @returns {Promise<unknown[]>}
 */
async function fetchAllPages(firstUrl) {
  /** @type {unknown[]} */
  const items = [];
  /** @type {string | null} */
  let url = firstUrl;
  for (let page = 0; url && page < 20; page++) {
    const response = await request(url, apiHeaders());
    if (!response.ok) throw new SyncError(describeFailure(response));
    const body = await response.json();
    if (!Array.isArray(body)) throw new SyncError(`Unexpected response from ${url}: not a list`);
    items.push(...body);
    const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('link') ?? '');
    url = next && next[1] ? next[1] : null;
  }
  return items;
}

/**
 * @param {unknown} raw
 * @returns {Promise<Map<string, string> | undefined>}
 */
async function fetchChecksums(raw) {
  if (typeof raw !== 'object' || raw === null || !('assets' in raw) || !Array.isArray(raw.assets)) return undefined;
  const list = raw.assets.find((a) => typeof a?.name === 'string' && isChecksumsAsset(a.name));
  if (!list || typeof list.browser_download_url !== 'string') return undefined;
  const response = await request(list.browser_download_url, { 'User-Agent': 'animaengine-website-release-sync' });
  if (!response.ok) throw new SyncError(`Could not download ${list.name}: ${response.status}`);
  return parseSha256Sums(await response.text());
}

/**
 * Writes atomically: a crash mid-write never leaves a half-written file.
 * @param {string} file
 * @param {string} content
 */
async function writeAtomic(file, content) {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, file);
}

async function main() {
  console.log(`Fetching releases of ${REPOSITORY} from the GitHub API…`);
  const rawReleases = await fetchAllPages(`${API}/repos/${REPOSITORY}/releases?per_page=100`);
  const rawTags = await fetchAllPages(`${API}/repos/${REPOSITORY}/tags?per_page=100`);

  const releases = [];
  for (const raw of rawReleases) {
    if (typeof raw === 'object' && raw !== null && 'draft' in raw && raw.draft === true) continue;
    const checksums = await fetchChecksums(raw);
    const release = normalizeRelease(raw, checksums);
    if (release) releases.push(release);
  }
  const sorted = sortReleases(releases);

  if (sorted.length === 0 && !args.has('--allow-empty')) {
    throw new SyncError(
      'GitHub returned no published releases. Refusing to overwrite the manifest; pass --allow-empty if that is really the case.',
    );
  }

  const released = new Set(sorted.map((r) => r.tag));
  const tagsWithoutRelease = rawTags
    .map((t) => (typeof t === 'object' && t !== null && 'name' in t && typeof t.name === 'string' ? t.name : ''))
    .filter((name) => name !== '' && !released.has(name));

  const manifest = {
    $comment: 'Generated by scripts/sync-releases.mjs from the GitHub Releases API. Do not edit by hand.',
    repository: REPOSITORY,
    syncedAt: new Date().toISOString(),
    releases: sorted,
    tagsWithoutRelease,
  };

  for (const r of sorted) {
    const withSum = r.assets.filter((a) => a.sha256).length;
    console.log(`  ${r.tag.padEnd(12)} ${r.prerelease ? 'pre-release' : 'release    '} ${r.assets.length} assets, ${withSum} with SHA-256`);
  }
  console.log(`  ${tagsWithoutRelease.length} tags without a GitHub release`);

  if (args.has('--dry-run')) {
    console.log('Dry run: nothing written.');
    return;
  }

  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await mkdir(CHANGELOG_DIR, { recursive: true });

  /** @type {Set<string>} */
  const written = new Set();
  for (const raw of rawReleases) {
    const release = sorted.find((r) => typeof raw === 'object' && raw !== null && 'tag_name' in raw && raw.tag_name === r.tag);
    if (!release) continue;
    const body = typeof raw === 'object' && raw !== null && 'body' in raw && typeof raw.body === 'string' ? raw.body : '';
    const file = `${release.tag}.md`;
    const notes = absolutizeLinks(prepareReleaseNotes(body), REPOSITORY, release.tag);
    await writeAtomic(path.join(CHANGELOG_DIR, file), changelogEntry(release, notes));
    written.add(file);
  }
  // Remove entries for releases that no longer exist (only files this script made).
  for (const file of await readdir(CHANGELOG_DIR)) {
    if (!file.endsWith('.md') || written.has(file)) continue;
    const content = await readFile(path.join(CHANGELOG_DIR, file), 'utf8');
    if (content.includes('Generated by scripts/sync-releases.mjs')) await rm(path.join(CHANGELOG_DIR, file));
  }

  await writeAtomic(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, MANIFEST)} and ${written.size} changelog entries.`);
}

main().catch((error) => {
  console.error(error instanceof SyncError ? `sync-releases: ${error.message}` : error);
  console.error('Nothing was changed.');
  process.exit(1);
});
