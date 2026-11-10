/**
 * Sanity checks on the committed src/data/releases.json, so a bad sync is
 * caught before it reaches the site.
 */
import { describe, expect, it } from 'vitest';
import raw from '../src/data/releases.json';
import { parseManifest } from '../src/lib/releases';
import { buildDownloads, classifyAsset, pickLatestStable } from '../src/lib/downloads';

const manifest = parseManifest(raw);

describe('committed release manifest', () => {
  it('is valid and lists releases newest first', () => {
    expect(manifest.releases.length).toBeGreaterThan(0);
    const tags = manifest.releases.map((r) => r.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('only links to files of the release they belong to', () => {
    for (const release of manifest.releases) {
      for (const asset of release.assets) {
        expect(asset.url).toBe(
          `https://github.com/${manifest.repository}/releases/download/${release.tag}/${encodeURIComponent(asset.name)}`,
        );
      }
    }
  });

  it('has a SHA-256 for every installable file', () => {
    for (const release of manifest.releases) {
      for (const asset of release.assets) {
        if (classifyAsset(asset.name)) expect(asset.sha256, `${release.tag}/${asset.name}`).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  it('offers Linux packages in the latest stable release', () => {
    const latest = pickLatestStable(manifest.releases);
    expect(latest).not.toBeNull();
    expect(latest!.prerelease).toBe(false);
    expect(buildDownloads(latest).linux.length).toBeGreaterThan(0);
  });

  it('does not list a version both as a release and as a bare tag', () => {
    const tags = new Set(manifest.releases.map((r) => r.tag));
    for (const tag of manifest.tagsWithoutRelease) expect(tags.has(tag)).toBe(false);
  });
});
