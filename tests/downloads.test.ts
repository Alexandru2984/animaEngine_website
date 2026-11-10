import { describe, expect, it } from 'vitest';
import { buildDownloads, classifyAsset, hasInstallableAssets, pickLatestStable, recommend } from '../src/lib/downloads';
import type { Detection } from '../src/lib/os-detect';
import type { Release, ReleaseAsset } from '../src/lib/releases';

const asset = (name: string, size = 1000): ReleaseAsset => ({
  name,
  url: `https://github.com/Alexandru2984/animaEngine/releases/download/v1.5.1/${name}`,
  size,
  contentType: null,
  sha256: 'a'.repeat(64),
});

/** The file names actually published with v1.5.1. */
const REAL_151 = [
  'anima-engine_1.5.1-1_amd64.deb',
  'animaEngine-1.5.1-windows-x86_64-setup.exe',
  'animaEngine-1.5.1-windows-x86_64.zip',
  'animaEngine-1.5.1-x86_64.AppImage',
  'SHA256SUMS-v1.5.1.txt',
];

const release = (version: string, names: string[], prerelease = false): Release => ({
  tag: `v${version}`,
  version,
  name: `animaEngine ${version}`,
  publishedAt: '2026-11-10T17:49:35Z',
  prerelease,
  url: `https://github.com/Alexandru2984/animaEngine/releases/tag/v${version}`,
  checksumsUrl: null,
  assets: names.map((n) => asset(n)),
});

const detect = (os: Detection['os'], extra: Partial<Detection> = {}): Detection => ({
  os,
  arch: 'unknown',
  linuxFamily: 'unknown',
  source: 'user-agent',
  ...extra,
});

describe('classifyAsset', () => {
  it('classifies the files animaEngine publishes', () => {
    expect(classifyAsset('anima-engine_1.5.1-1_amd64.deb')).toEqual({ os: 'linux', arch: 'x86_64', format: 'deb' });
    expect(classifyAsset('animaEngine-1.5.1-x86_64.AppImage')).toEqual({ os: 'linux', arch: 'x86_64', format: 'appimage' });
    expect(classifyAsset('animaEngine-1.5.1-windows-x86_64-setup.exe')).toEqual({
      os: 'windows',
      arch: 'x86_64',
      format: 'installer',
    });
    expect(classifyAsset('animaEngine-1.5.1-windows-x86_64.zip')).toEqual({ os: 'windows', arch: 'x86_64', format: 'zip' });
  });

  it('ignores checksum lists, signatures and source archives', () => {
    expect(classifyAsset('SHA256SUMS-v1.5.1.txt')).toBeNull();
    expect(classifyAsset('SHA256SUMS')).toBeNull();
    expect(classifyAsset('animaEngine-1.5.1-x86_64.AppImage.sig')).toBeNull();
    expect(classifyAsset('animaEngine-1.5.1-src.tar.gz')).toBeNull();
    expect(classifyAsset('animaEngine-1.5.1-debug-x86_64.zip')).toBeNull();
    expect(classifyAsset('')).toBeNull();
  });

  it('recognises formats the project might publish later', () => {
    expect(classifyAsset('anima-engine-1.6.0-1.x86_64.rpm')).toEqual({ os: 'linux', arch: 'x86_64', format: 'rpm' });
    expect(classifyAsset('animaEngine-1.6.0-aarch64.AppImage')).toEqual({ os: 'linux', arch: 'aarch64', format: 'appimage' });
    expect(classifyAsset('anima-engine_1.6.0-1_arm64.deb')).toEqual({ os: 'linux', arch: 'aarch64', format: 'deb' });
    expect(classifyAsset('animaEngine-1.6.0-linux-x86_64.tar.gz')).toEqual({ os: 'linux', arch: 'x86_64', format: 'tarball' });
    expect(classifyAsset('animaEngine-1.6.0.dmg')).toEqual({ os: 'macos', arch: 'universal', format: 'dmg' });
  });

  it('refuses packages whose CPU cannot be told, rather than guessing', () => {
    expect(classifyAsset('animaEngine.AppImage')).toBeNull();
    expect(classifyAsset('animaEngine-setup.exe')).toBeNull();
    expect(classifyAsset('animaEngine-1.5.1.zip')).toBeNull();
  });
});

describe('pickLatestStable', () => {
  it('picks the highest stable version, not the newest upload', () => {
    const releases = [release('1.2.0', REAL_151), release('1.5.1', REAL_151), release('1.5.0', REAL_151)];
    expect(pickLatestStable(releases)?.version).toBe('1.5.1');
  });

  it('skips pre-releases and releases without packages', () => {
    const releases = [
      release('1.6.0-rc1', REAL_151, true),
      release('1.5.2', ['SHA256SUMS-v1.5.2.txt']),
      release('1.5.1', REAL_151),
    ];
    expect(pickLatestStable(releases)?.version).toBe('1.5.1');
    expect(hasInstallableAssets(releases[1]!)).toBe(false);
  });

  it('returns null when nothing can be downloaded', () => {
    expect(pickLatestStable([])).toBeNull();
    expect(pickLatestStable([release('1.0.0-rc1', REAL_151, true)])).toBeNull();
  });
});

describe('buildDownloads', () => {
  it('groups the real 1.5.1 files by system, best format first', () => {
    const d = buildDownloads(release('1.5.1', REAL_151));
    expect(d.linux.map((o) => o.format)).toEqual(['appimage', 'deb']);
    expect(d.windows.map((o) => o.format)).toEqual(['installer', 'zip']);
    expect(d.macos).toEqual([]);
    expect(d.linux[0]).toMatchObject({
      id: 'linux-appimage-x86_64',
      fileName: 'animaEngine-1.5.1-x86_64.AppImage',
      url: 'https://github.com/Alexandru2984/animaEngine/releases/download/v1.5.1/animaEngine-1.5.1-x86_64.AppImage',
      sha256: 'a'.repeat(64),
    });
  });

  it('is empty without a release', () => {
    expect(buildDownloads(null)).toEqual({ linux: [], windows: [], macos: [] });
  });
});

describe('recommend', () => {
  const downloads = buildDownloads(release('1.5.1', REAL_151));

  it('suggests the AppImage on Linux, or the .deb on Debian-family systems', () => {
    const generic = recommend(downloads, detect('linux', { arch: 'x86_64' }));
    expect(generic).toMatchObject({ kind: 'download', os: 'linux', primary: { format: 'appimage' }, archMismatch: null });
    if (generic.kind === 'download') expect(generic.alternatives.map((o) => o.format)).toEqual(['deb']);

    expect(recommend(downloads, detect('linux', { linuxFamily: 'debian' }))).toMatchObject({ primary: { format: 'deb' } });
    // No .rpm is published, so Fedora gets the AppImage, not a .deb.
    expect(recommend(downloads, detect('linux', { linuxFamily: 'fedora' }))).toMatchObject({ primary: { format: 'appimage' } });
  });

  it('suggests the installer on Windows', () => {
    expect(recommend(downloads, detect('windows'))).toMatchObject({ kind: 'download', primary: { format: 'installer' } });
  });

  it('flags a CPU with no matching build but still offers what exists', () => {
    const rec = recommend(downloads, detect('linux', { arch: 'arm64' }));
    expect(rec).toMatchObject({ kind: 'download', primary: { arch: 'x86_64' }, archMismatch: 'arm64' });
  });

  it('prefers a build for the detected CPU when one exists', () => {
    const withArm = buildDownloads(release('1.6.0', [...REAL_151, 'animaEngine-1.6.0-aarch64.AppImage']));
    expect(recommend(withArm, detect('linux', { arch: 'arm64' }))).toMatchObject({
      primary: { arch: 'aarch64' },
      archMismatch: null,
    });
  });

  it('reports macOS as unavailable, never as a download', () => {
    expect(recommend(downloads, detect('macos'))).toEqual({ kind: 'unavailable', os: 'macos' });
  });

  it('reports a supported system with no file in the release as unavailable', () => {
    const linuxOnly = buildDownloads(release('1.2.0', ['anima-engine_1.2.0-1_amd64.deb', 'animaEngine-1.2.0-x86_64.AppImage']));
    expect(recommend(linuxOnly, detect('windows'))).toEqual({ kind: 'unavailable', os: 'windows' });
  });

  it('handles phones, ChromeOS and unknown systems without suggesting a file', () => {
    expect(recommend(downloads, detect('android'))).toEqual({ kind: 'not-desktop', os: 'android' });
    expect(recommend(downloads, detect('ios'))).toEqual({ kind: 'not-desktop', os: 'ios' });
    expect(recommend(downloads, detect('chromeos'))).toEqual({ kind: 'not-desktop', os: 'chromeos' });
    expect(recommend(downloads, detect('unknown'))).toEqual({ kind: 'unknown' });
  });

  it('copes with no release at all', () => {
    expect(recommend(buildDownloads(null), detect('linux'))).toEqual({ kind: 'unavailable', os: 'linux' });
  });
});
