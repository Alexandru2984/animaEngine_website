#!/usr/bin/env node
// @ts-check
/**
 * Prints how often each animaEngine release file has been downloaded.
 *
 * Every download button on animaengine.eu links straight to GitHub Releases,
 * and GitHub counts each download of each file (`download_count` in the
 * Releases API). That count is the download record: the website itself
 * tracks nobody. It includes automated downloads (mirrors, CI, bots) and
 * counts a re-download again.
 *
 * Usage: node scripts/download-stats.mjs [--json]
 * Env:   GITHUB_TOKEN (optional) for a higher API rate limit.
 */

const REPOSITORY = process.env.ANIMA_REPOSITORY ?? 'Alexandru2984/animaEngine';
const asJson = process.argv.includes('--json');

/** @param {string} name */
function platformOf(name) {
  if (/^SHA\d*SUMS/i.test(name)) return 'checksums';
  if (/\.(appimage|deb|rpm|flatpak)$/i.test(name) || /linux.*\.tar\./i.test(name)) return 'Linux';
  if (/\.(exe|msi)$/i.test(name) || /windows.*\.zip$/i.test(name)) return 'Windows';
  if (/\.(dmg|pkg)$/i.test(name) || /mac(os)?.*\.zip$/i.test(name)) return 'macOS';
  if (/\.apk$/i.test(name)) return 'Android';
  return 'other';
}

async function fetchReleases() {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'animaengine-website-download-stats',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  /** @type {any[]} */
  const all = [];
  /** @type {string | null} */
  let url = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=100`;
  while (url) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      const limited = response.headers.get('x-ratelimit-remaining') === '0';
      throw new Error(limited ? 'GitHub API rate limit reached; set GITHUB_TOKEN.' : `GitHub answered ${response.status}`);
    }
    all.push(...(await response.json()));
    const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('link') ?? '');
    url = next && next[1] ? next[1] : null;
  }
  return all.filter((r) => !r.draft);
}

/**
 * @typedef {{ name: string, platform: string, downloads: number }} FileRow
 * @typedef {{ tag: string, prerelease: boolean, publishedAt: string, files: FileRow[] }} ReleaseRow
 */

async function main() {
  const releases = await fetchReleases();
  /** @type {ReleaseRow[]} */
  const rows = releases.map((r) => ({
    tag: String(r.tag_name),
    prerelease: Boolean(r.prerelease),
    publishedAt: String(r.published_at ?? '').slice(0, 10),
    files: (r.assets ?? []).map((/** @type {any} */ a) => ({
      name: String(a.name),
      platform: platformOf(String(a.name)),
      downloads: Number(a.download_count ?? 0),
    })),
  }));

  if (asJson) {
    console.log(JSON.stringify({ repository: REPOSITORY, fetchedAt: new Date().toISOString(), releases: rows }, null, 2));
    return;
  }

  /** @type {Record<string, number>} */
  const byPlatform = {};
  let total = 0;
  console.log(`Downloads of ${REPOSITORY} release files (GitHub's counters, checksum lists excluded from totals)\n`);
  for (const r of rows) {
    const packages = r.files.filter((f) => f.platform !== 'checksums');
    const sum = packages.reduce((n, f) => n + f.downloads, 0);
    total += sum;
    console.log(`${r.tag}${r.prerelease ? ' (pre-release)' : ''}  ${r.publishedAt}  ${sum} downloads`);
    for (const f of packages) {
      byPlatform[f.platform] = (byPlatform[f.platform] ?? 0) + f.downloads;
      console.log(`  ${String(f.downloads).padStart(6)}  ${f.platform.padEnd(8)} ${f.name}`);
    }
  }
  console.log('\nBy platform:');
  for (const [platform, n] of Object.entries(byPlatform).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)}  ${platform}`);
  }
  console.log(`  ${String(total).padStart(6)}  total`);
}

main().catch((error) => {
  console.error(`download-stats: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
