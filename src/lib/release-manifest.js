// @ts-check
/**
 * Pure helpers that turn GitHub Releases API data into the site's release
 * manifest (src/data/releases.json) and changelog entries.
 *
 * Plain JavaScript with JSDoc types so that both the Node maintenance script
 * (scripts/sync-releases.mjs, run without a TypeScript loader) and the Astro
 * site can import it. Nothing here does I/O.
 */

/**
 * @typedef {object} ManifestAsset
 * @property {string} name          File name exactly as published.
 * @property {string} url           browser_download_url on github.com.
 * @property {number} size          Size in bytes.
 * @property {string | null} contentType
 * @property {string | null} sha256 Lower-case hex digest, or null if unknown.
 */

/**
 * @typedef {object} ManifestRelease
 * @property {string} tag
 * @property {string} version
 * @property {string} name
 * @property {string} publishedAt   ISO 8601 timestamp.
 * @property {boolean} prerelease
 * @property {string} url           The release page on github.com.
 * @property {string | null} checksumsUrl  URL of the SHA256SUMS file, if any.
 * @property {ManifestAsset[]} assets
 */

const SHA256_LINE = /^([0-9a-fA-F]{64})\s+\*?(.+)$/;
const DIGEST = /^sha256:([0-9a-fA-F]{64})$/;

/**
 * Parses the output of `sha256sum` (GNU coreutils format).
 * Lines that are not "<64 hex> <name>" are ignored.
 *
 * @param {string} text
 * @returns {Map<string, string>} file name -> lower-case digest
 */
export function parseSha256Sums(text) {
  /** @type {Map<string, string>} */
  const sums = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = SHA256_LINE.exec(line);
    if (!match || !match[1] || !match[2]) continue;
    const name = match[2].trim().replace(/^\.\//, '');
    sums.set(name, match[1].toLowerCase());
  }
  return sums;
}

/**
 * @param {string} name
 * @returns {boolean} whether the asset is a checksum list such as SHA256SUMS-v1.5.1.txt
 */
export function isChecksumsAsset(name) {
  return /^SHA256SUMS(?:[-_.][\w.-]*)?$/i.test(name);
}

/**
 * GitHub reports `digest: "sha256:<hex>"` for assets uploaded since mid-2025.
 *
 * @param {unknown} digest
 * @returns {string | null}
 */
export function digestToSha256(digest) {
  if (typeof digest !== 'string') return null;
  const match = DIGEST.exec(digest);
  return match && match[1] ? match[1].toLowerCase() : null;
}

/**
 * @param {string} tag
 * @returns {string}
 */
export function versionFromTag(tag) {
  return tag.replace(/^v(?=\d)/i, '');
}

/**
 * Splits "1.0.0-rc3" into comparable parts. Unparseable versions sort last.
 *
 * @param {string} version
 * @returns {{ core: number[], pre: Array<string | number> } | null}
 */
function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
  if (!match) return null;
  const core = [Number(match[1]), Number(match[2]), Number(match[3])];
  const pre = match[4]
    ? match[4].split('.').flatMap((part) => {
        // "rc3" -> ["rc", 3] so that rc10 sorts after rc9.
        const m = /^([A-Za-z-]*)(\d*)$/.exec(part);
        if (!m) return [part];
        /** @type {Array<string | number>} */
        const out = [];
        if (m[1]) out.push(m[1]);
        if (m[2]) out.push(Number(m[2]));
        return out;
      })
    : [];
  return { core, pre };
}

/**
 * Semantic-version comparison: negative if a < b, positive if a > b.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa && !pb) return a.localeCompare(b);
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 0; i < 3; i++) {
    const diff = (pa.core[i] ?? 0) - (pb.core[i] ?? 0);
    if (diff !== 0) return diff;
  }
  // A version without a pre-release tag is newer than one with it.
  if (pa.pre.length === 0 && pb.pre.length > 0) return 1;
  if (pa.pre.length > 0 && pb.pre.length === 0) return -1;
  const len = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < len; i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalises one release object from `GET /repos/{owner}/{repo}/releases`.
 * Drafts and malformed entries return null. If a checksum list is given, its
 * digests are cross-checked against GitHub's own `digest` field; a mismatch
 * throws, because publishing a wrong checksum is worse than publishing none.
 *
 * @param {unknown} raw
 * @param {Map<string, string>} [checksums]
 * @returns {ManifestRelease | null}
 */
export function normalizeRelease(raw, checksums) {
  if (!isRecord(raw) || raw.draft === true) return null;
  const tag = typeof raw.tag_name === 'string' ? raw.tag_name : '';
  const url = typeof raw.html_url === 'string' ? raw.html_url : '';
  const publishedAt = typeof raw.published_at === 'string' ? raw.published_at : '';
  if (!tag || !url || !publishedAt) return null;

  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  /** @type {ManifestAsset[]} */
  const assets = [];
  let checksumsUrl = null;
  for (const asset of rawAssets) {
    if (!isRecord(asset)) continue;
    if (asset.state !== undefined && asset.state !== 'uploaded') continue;
    const name = typeof asset.name === 'string' ? asset.name : '';
    const downloadUrl = typeof asset.browser_download_url === 'string' ? asset.browser_download_url : '';
    if (!name || !downloadUrl.startsWith('https://')) continue;

    const fromGitHub = digestToSha256(asset.digest);
    const fromList = checksums?.get(name) ?? null;
    if (fromGitHub && fromList && fromGitHub !== fromList) {
      throw new Error(
        `Checksum mismatch for ${name} in ${tag}: SHA256SUMS says ${fromList}, GitHub says ${fromGitHub}`,
      );
    }
    if (isChecksumsAsset(name)) checksumsUrl = downloadUrl;

    assets.push({
      name,
      url: downloadUrl,
      size: typeof asset.size === 'number' ? asset.size : 0,
      contentType: typeof asset.content_type === 'string' ? asset.content_type : null,
      sha256: fromList ?? fromGitHub,
    });
  }
  assets.sort((a, b) => a.name.localeCompare(b.name));

  return {
    tag,
    version: versionFromTag(tag),
    name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : tag,
    publishedAt,
    prerelease: raw.prerelease === true,
    url,
    checksumsUrl,
    assets,
  };
}

/**
 * @param {ManifestRelease[]} releases
 * @returns {ManifestRelease[]} newest first, by semantic version
 */
export function sortReleases(releases) {
  return [...releases].sort((a, b) => compareVersions(b.version, a.version));
}

/**
 * Prepares a release body for the changelog page, where each release is an
 * <h2>: drops a leading "# Title" line and moves every other ATX heading one
 * level down (outside fenced code blocks), so the page keeps one <h1>.
 *
 * @param {string | null | undefined} body
 * @returns {string}
 */
export function prepareReleaseNotes(body) {
  if (!body) return '';
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  /** @type {string[]} */
  const out = [];
  let fence = '';
  let seenContent = false;
  for (const line of lines) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch && fenceMatch[1]) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = '';
      out.push(line);
      seenContent = true;
      continue;
    }
    if (!fence) {
      if (!seenContent && /^#\s+\S/.test(line)) {
        seenContent = true;
        continue; // the release title; the page prints its own
      }
      const heading = /^(#{1,5})(\s+.*)$/.exec(line);
      if (heading && heading[1] && heading[2] !== undefined) {
        out.push(`#${heading[1]}${heading[2]}`);
        seenContent = true;
        continue;
      }
    }
    if (line.trim() !== '') seenContent = true;
    out.push(line);
  }
  return out.join('\n').trim() + '\n';
}

/**
 * Release bodies are copies of docs/release-notes/<tag>.md, so their relative
 * links ("../config.md", "v1.2.0.md") point into the repository. Rewrites
 * them to absolute GitHub URLs at that tag; leaves code, absolute URLs and
 * in-page anchors alone.
 *
 * @param {string} markdown
 * @param {string} repository  "owner/name"
 * @param {string} tag
 * @returns {string}
 */
export function absolutizeLinks(markdown, repository, tag) {
  const base = `https://github.com/${repository}/blob/${encodeURIComponent(tag)}/docs/release-notes/`;
  const rewrite = (/** @type {string} */ target) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return target;
    try {
      return new URL(target, base).href;
    } catch {
      return target;
    }
  };
  let fence = '';
  return markdown
    .split('\n')
    .map((line) => {
      const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
      if (fenceMatch && fenceMatch[1]) {
        if (!fence) fence = fenceMatch[1];
        else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = '';
        return line;
      }
      if (fence) return line;
      // Inline code spans are kept out of the rewrite.
      return line
        .split(/(`[^`]*`)/)
        .map((part) =>
          part.startsWith('`')
            ? part
            : part
                .replace(/(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, open, target, close) => `${open}${rewrite(target)}${close}`)
                .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (_, open, target) => `${open}${rewrite(target)}`),
        )
        .join('');
    })
    .join('\n');
}

/**
 * @param {ManifestRelease} release
 * @param {string} notes  Output of prepareReleaseNotes.
 * @returns {string} a Markdown file with YAML front matter
 */
export function changelogEntry(release, notes) {
  // JSON strings are valid YAML scalars, which sidesteps quoting rules.
  const front = [
    '---',
    '# Generated by scripts/sync-releases.mjs from GitHub Releases. Do not edit.',
    `title: ${JSON.stringify(release.name)}`,
    `version: ${JSON.stringify(release.version)}`,
    `tag: ${JSON.stringify(release.tag)}`,
    `publishedAt: ${JSON.stringify(release.publishedAt)}`,
    `prerelease: ${release.prerelease}`,
    `url: ${JSON.stringify(release.url)}`,
    '---',
  ];
  return `${front.join('\n')}\n\n${notes}`;
}
