import { describe, expect, it } from 'vitest';
import {
  absolutizeLinks,
  changelogEntry,
  compareVersions,
  digestToSha256,
  isChecksumsAsset,
  normalizeRelease,
  parseSha256Sums,
  prepareReleaseNotes,
  sortReleases,
  versionFromTag,
} from '../src/lib/release-manifest.js';
import { parseManifest } from '../src/lib/releases';

const H1 = 'b4641797c627ba3319cbb7f3841c3205c751c5484392091f9752ff4ad791ee16';
const H2 = 'fbdea79329251ddeee75cda8de03e92c8d2b49e2912686d8bf999b2811b688c9';

/** Shaped like GET /repos/{owner}/{repo}/releases, trimmed to the fields used. */
const apiRelease = (overrides: Record<string, unknown> = {}) => ({
  tag_name: 'v1.5.1',
  name: 'animaEngine 1.5.1',
  draft: false,
  prerelease: false,
  html_url: 'https://github.com/Alexandru2984/animaEngine/releases/tag/v1.5.1',
  published_at: '2026-11-10T17:49:35Z',
  body: '# animaEngine 1.5.1\r\n\r\nNotes.\r\n',
  assets: [
    {
      name: 'anima-engine_1.5.1-1_amd64.deb',
      state: 'uploaded',
      size: 9298504,
      content_type: 'application/x-debian-package',
      digest: `sha256:${H1}`,
      browser_download_url: 'https://github.com/Alexandru2984/animaEngine/releases/download/v1.5.1/anima-engine_1.5.1-1_amd64.deb',
    },
    {
      name: 'animaEngine-1.5.1-x86_64.AppImage',
      state: 'uploaded',
      size: 11987448,
      content_type: 'application/vnd.appimage',
      digest: null,
      browser_download_url: 'https://github.com/Alexandru2984/animaEngine/releases/download/v1.5.1/animaEngine-1.5.1-x86_64.AppImage',
    },
    {
      name: 'SHA256SUMS-v1.5.1.txt',
      state: 'uploaded',
      size: 409,
      content_type: 'text/plain',
      browser_download_url: 'https://github.com/Alexandru2984/animaEngine/releases/download/v1.5.1/SHA256SUMS-v1.5.1.txt',
    },
    { name: 'half-uploaded.deb', state: 'new', size: 1, browser_download_url: 'https://github.com/x/y/z.deb' },
  ],
  ...overrides,
});

describe('parseSha256Sums', () => {
  it('reads sha256sum output, including binary-mode markers and CRLF', () => {
    const text = `${H1}  anima-engine_1.5.1-1_amd64.deb\r\n${H2.toUpperCase()} *animaEngine-1.5.1-x86_64.AppImage\n\n# comment\nnot a line\n`;
    const sums = parseSha256Sums(text);
    expect(sums.size).toBe(2);
    expect(sums.get('anima-engine_1.5.1-1_amd64.deb')).toBe(H1);
    expect(sums.get('animaEngine-1.5.1-x86_64.AppImage')).toBe(H2);
  });

  it('returns an empty map for empty or invalid input', () => {
    expect(parseSha256Sums('').size).toBe(0);
    expect(parseSha256Sums('abc  file').size).toBe(0);
  });
});

describe('small helpers', () => {
  it('recognises checksum lists', () => {
    expect(isChecksumsAsset('SHA256SUMS-v1.5.1.txt')).toBe(true);
    expect(isChecksumsAsset('SHA256SUMS')).toBe(true);
    expect(isChecksumsAsset('animaEngine.zip')).toBe(false);
  });

  it('reads GitHub digests', () => {
    expect(digestToSha256(`sha256:${H1}`)).toBe(H1);
    expect(digestToSha256('sha512:abc')).toBeNull();
    expect(digestToSha256(null)).toBeNull();
  });

  it('strips the v from tags', () => {
    expect(versionFromTag('v1.0.0-rc3')).toBe('1.0.0-rc3');
    expect(versionFromTag('nightly')).toBe('nightly');
  });
});

describe('compareVersions', () => {
  it('orders versions semantically', () => {
    const sorted = ['0.9.0', '1.0.0', '1.0.0-rc3', '1.0.0-rc1', '1.10.0', '1.2.0', '1.0.0-rc10'].sort(compareVersions);
    expect(sorted).toEqual(['0.9.0', '1.0.0-rc1', '1.0.0-rc3', '1.0.0-rc10', '1.0.0', '1.2.0', '1.10.0']);
  });

  it('accepts a leading v and treats equal versions as equal', () => {
    expect(compareVersions('v1.5.1', '1.5.1')).toBe(0);
  });
});

describe('normalizeRelease', () => {
  it('keeps uploaded assets and fills checksums from the list and from GitHub', () => {
    const sums = new Map([['animaEngine-1.5.1-x86_64.AppImage', H2]]);
    const release = normalizeRelease(apiRelease(), sums);
    expect(release).not.toBeNull();
    expect(release!.version).toBe('1.5.1');
    expect(release!.checksumsUrl).toMatch(/SHA256SUMS-v1\.5\.1\.txt$/);
    expect(release!.assets.map((a) => a.name)).toEqual([
      'anima-engine_1.5.1-1_amd64.deb',
      'animaEngine-1.5.1-x86_64.AppImage',
      'SHA256SUMS-v1.5.1.txt',
    ]);
    expect(release!.assets[0]!.sha256).toBe(H1); // from GitHub's digest
    expect(release!.assets[1]!.sha256).toBe(H2); // from SHA256SUMS
    expect(release!.assets[2]!.sha256).toBeNull();
  });

  it('refuses a checksum that disagrees with GitHub', () => {
    const wrong = new Map([['anima-engine_1.5.1-1_amd64.deb', H2]]);
    expect(() => normalizeRelease(apiRelease(), wrong)).toThrow(/Checksum mismatch/);
  });

  it('drops drafts and malformed entries', () => {
    expect(normalizeRelease(apiRelease({ draft: true }))).toBeNull();
    expect(normalizeRelease(apiRelease({ tag_name: undefined }))).toBeNull();
    expect(normalizeRelease(null)).toBeNull();
    expect(normalizeRelease('nonsense')).toBeNull();
  });

  it('falls back to the tag when the release has no name, and survives missing assets', () => {
    const release = normalizeRelease(apiRelease({ name: '  ', assets: undefined }));
    expect(release).toMatchObject({ name: 'v1.5.1', assets: [], checksumsUrl: null });
  });

  it('produces data that the site schema accepts', () => {
    const release = normalizeRelease(apiRelease())!;
    const manifest = parseManifest({
      repository: 'Alexandru2984/animaEngine',
      syncedAt: '2026-11-10T20:00:00.000Z',
      releases: [release],
      tagsWithoutRelease: ['v1.4.0'],
    });
    expect(manifest.releases[0]!.tag).toBe('v1.5.1');
  });

  it('sorts newest first', () => {
    const a = normalizeRelease(apiRelease())!;
    const b = normalizeRelease(apiRelease({ tag_name: 'v1.10.0' }))!;
    const c = normalizeRelease(apiRelease({ tag_name: 'v1.0.0-rc1', prerelease: true }))!;
    expect(sortReleases([a, c, b]).map((r) => r.tag)).toEqual(['v1.10.0', 'v1.5.1', 'v1.0.0-rc1']);
  });
});

describe('parseManifest', () => {
  it('rejects download links that do not point at GitHub', () => {
    const release = normalizeRelease(apiRelease())!;
    release.assets[0]!.url = 'https://example.com/evil.deb';
    expect(() =>
      parseManifest({ repository: 'a/b', syncedAt: '2026-11-10T20:00:00.000Z', releases: [release], tagsWithoutRelease: [] }),
    ).toThrow(/invalid/);
  });

  it('accepts an empty release list', () => {
    expect(parseManifest({ repository: 'a/b', syncedAt: '2026-11-10T20:00:00.000Z', releases: [], tagsWithoutRelease: [] }).releases).toEqual([]);
  });
});

describe('prepareReleaseNotes', () => {
  it('drops the title and moves headings down a level, but not inside code', () => {
    const body = ['# animaEngine 1.5.1', '', 'Intro', '', '## Fixed', '', '```bash', '# a comment', '## not a heading', '```', '', '### Deep'].join('\r\n');
    expect(prepareReleaseNotes(body)).toBe(
      ['Intro', '', '### Fixed', '', '```bash', '# a comment', '## not a heading', '```', '', '#### Deep', ''].join('\n'),
    );
  });

  it('keeps a body without a title as is, apart from the heading levels', () => {
    expect(prepareReleaseNotes('Text\n## Notes')).toBe('Text\n### Notes\n');
    expect(prepareReleaseNotes(null)).toBe('');
  });
});

describe('changelogEntry', () => {
  it('writes front matter that survives quotes in titles', () => {
    const release = normalizeRelease(apiRelease({ name: 'animaEngine 1.0.0 — "the contract"' }))!;
    const file = changelogEntry(release, 'Body\n');
    expect(file).toContain('title: "animaEngine 1.0.0 — \\"the contract\\""');
    expect(file).toContain('prerelease: false');
    expect(file.endsWith('---\n\nBody\n')).toBe(true);
  });
});

describe('absolutizeLinks', () => {
  const repo = 'Alexandru2984/animaEngine';
  it('points relative links at the repository, at the release tag', () => {
    const md = 'See [policy](../stability-policy.md), [1.2](v1.2.0.md "notes") and [log](../../CHANGELOG.md#top).';
    expect(absolutizeLinks(md, repo, 'v1.5.0')).toBe(
      'See [policy](https://github.com/Alexandru2984/animaEngine/blob/v1.5.0/docs/stability-policy.md), ' +
        '[1.2](https://github.com/Alexandru2984/animaEngine/blob/v1.5.0/docs/release-notes/v1.2.0.md "notes") and ' +
        '[log](https://github.com/Alexandru2984/animaEngine/blob/v1.5.0/CHANGELOG.md#top).',
    );
  });

  it('leaves absolute URLs, anchors, inline code and code blocks alone', () => {
    const md = ['[a](https://rhai.rs) [b](#fixed) `[c](d.md)`', '```', '[e](f.md)', '```', '[ref]: ../x.md'].join('\n');
    expect(absolutizeLinks(md, repo, 'v1.0.0')).toBe(
      ['[a](https://rhai.rs) [b](#fixed) `[c](d.md)`', '```', '[e](f.md)', '```', '[ref]: https://github.com/Alexandru2984/animaEngine/blob/v1.0.0/docs/x.md'].join('\n'),
    );
  });
});
