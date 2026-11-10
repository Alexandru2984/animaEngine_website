/**
 * Turns release assets into download options and picks the one to suggest.
 * Classification works on the file names animaEngine actually publishes, and
 * recognises a few common formats it might publish later (rpm, tar, dmg…)
 * without inventing any: an option exists only if a release asset does.
 */
import type { Release, ReleaseAsset } from './releases';
import type { Detection, DetectedArch } from './os-detect';
import { compareVersions } from './release-manifest.js';

export type PlatformOS = 'linux' | 'windows' | 'macos';
export type Arch = 'x86_64' | 'aarch64' | 'armv7' | 'universal';
export type Format =
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'flatpak'
  | 'tarball'
  | 'installer'
  | 'msi'
  | 'zip'
  | 'dmg'
  | 'pkg';

export interface AssetClass {
  os: PlatformOS;
  arch: Arch;
  format: Format;
}

export interface DownloadOption extends AssetClass {
  id: string;
  label: string;
  summary: string;
  fileName: string;
  url: string;
  size: number;
  sha256: string | null;
}

export type DownloadsByOS = Record<PlatformOS, DownloadOption[]>;

export const PLATFORM_OSES: readonly PlatformOS[] = ['linux', 'windows', 'macos'];

export const FORMAT_INFO: Record<Format, { label: string; summary: string; rank: number }> = {
  appimage: { label: 'AppImage', summary: 'One file for most distributions: make it executable and run it.', rank: 1 },
  deb: { label: '.deb package', summary: 'For Debian, Ubuntu and their derivatives; installs with apt.', rank: 2 },
  rpm: { label: '.rpm package', summary: 'For Fedora, openSUSE and other RPM-based distributions.', rank: 3 },
  flatpak: { label: 'Flatpak bundle', summary: 'A sandboxed bundle; its runtime comes from Flathub.', rank: 4 },
  tarball: { label: 'Tar archive', summary: 'The program in an archive, to unpack anywhere.', rank: 5 },
  installer: { label: 'Installer (.exe)', summary: 'Installs for you alone, without administrator rights.', rank: 1 },
  msi: { label: 'MSI installer', summary: 'A Windows Installer package.', rank: 2 },
  zip: { label: 'Portable ZIP', summary: 'Unpack it and run it from any folder.', rank: 3 },
  dmg: { label: 'Disk image (.dmg)', summary: 'Open it and drag the app to Applications.', rank: 1 },
  pkg: { label: 'Installer (.pkg)', summary: 'A macOS installer package.', rank: 2 },
};

export const ARCH_LABELS: Record<Arch, string> = {
  x86_64: 'x86_64 (64-bit Intel/AMD)',
  aarch64: 'ARM64',
  armv7: '32-bit ARM',
  universal: 'Universal',
};

function archFromName(name: string): Arch | null {
  if (/(^|[^a-z0-9])(x86_64|x86-64|amd64|x64|win64)([^a-z0-9]|$)/i.test(name)) return 'x86_64';
  if (/(^|[^a-z0-9])(aarch64|arm64)([^a-z0-9]|$)/i.test(name)) return 'aarch64';
  if (/(^|[^a-z0-9])(armv7l?|armhf)([^a-z0-9]|$)/i.test(name)) return 'armv7';
  if (/(^|[^a-z0-9])universal([^a-z0-9]|$)/i.test(name)) return 'universal';
  return null;
}

/**
 * Classifies a release file by name. Returns null for anything that is not
 * an installable package: checksum lists, signatures, attestations, source
 * archives, debug symbols, or a file whose architecture cannot be told.
 */
export function classifyAsset(fileName: string): AssetClass | null {
  const name = fileName.trim();
  if (name === '') return null;
  if (/^SHA\d*SUMS/i.test(name)) return null;
  if (/\.(sig|asc|minisig|sha256|sha512|pem|crt|intoto\.jsonl|sbom\.json|spdx\.json)$/i.test(name)) return null;
  if (/(^|[-_.])(debug|dbgsym|symbols|src|source)([-_.]|$)/i.test(name)) return null;

  const arch = archFromName(name);
  let os: PlatformOS | null = null;
  let format: Format | null = null;

  if (/\.appimage$/i.test(name)) [os, format] = ['linux', 'appimage'];
  else if (/\.deb$/i.test(name)) [os, format] = ['linux', 'deb'];
  else if (/\.rpm$/i.test(name)) [os, format] = ['linux', 'rpm'];
  else if (/\.flatpak$/i.test(name)) [os, format] = ['linux', 'flatpak'];
  else if (/\.msi$/i.test(name)) [os, format] = ['windows', 'msi'];
  else if (/\.exe$/i.test(name)) [os, format] = ['windows', 'installer'];
  else if (/\.dmg$/i.test(name)) [os, format] = ['macos', 'dmg'];
  else if (/\.pkg$/i.test(name)) [os, format] = ['macos', 'pkg'];
  else if (/\.zip$/i.test(name)) {
    if (/windows|win(32|64)?([-_.]|$)/i.test(name)) [os, format] = ['windows', 'zip'];
    else if (/mac(os)?|darwin|osx/i.test(name)) [os, format] = ['macos', 'zip'];
  } else if (/\.tar\.(gz|xz|zst|bz2)$|\.tgz$/i.test(name)) {
    if (/linux/i.test(name)) [os, format] = ['linux', 'tarball'];
  }

  if (!os || !format) return null;
  if (!arch) return os === 'macos' ? { os, arch: 'universal', format } : null;
  return { os, arch, format };
}

/** Whether a release carries at least one installable package. */
export function hasInstallableAssets(release: Pick<Release, 'assets'>): boolean {
  return release.assets.some((a) => classifyAsset(a.name) !== null);
}

/**
 * The release to offer for download: the highest stable (non pre-release)
 * version that has installable files. Null when there is none.
 */
export function pickLatestStable<T extends Pick<Release, 'version' | 'prerelease' | 'assets'>>(releases: readonly T[]): T | null {
  let best: T | null = null;
  for (const release of releases) {
    if (release.prerelease || !hasInstallableAssets(release)) continue;
    if (!best || compareVersions(release.version, best.version) > 0) best = release;
  }
  return best;
}

function toOption(asset: ReleaseAsset, cls: AssetClass): DownloadOption {
  const info = FORMAT_INFO[cls.format];
  return {
    ...cls,
    id: `${cls.os}-${cls.format}-${cls.arch}`,
    label: info.label,
    summary: info.summary,
    fileName: asset.name,
    url: asset.url,
    size: asset.size,
    sha256: asset.sha256,
  };
}

/** Groups a release's packages by operating system, best format first. */
export function buildDownloads(release: Pick<Release, 'assets'> | null): DownloadsByOS {
  const result: DownloadsByOS = { linux: [], windows: [], macos: [] };
  if (!release) return result;
  for (const asset of release.assets) {
    const cls = classifyAsset(asset.name);
    if (cls) result[cls.os].push(toOption(asset, cls));
  }
  for (const os of PLATFORM_OSES) {
    result[os].sort(
      (a, b) => FORMAT_INFO[a.format].rank - FORMAT_INFO[b.format].rank || a.arch.localeCompare(b.arch),
    );
  }
  return result;
}

export type Recommendation =
  | {
      kind: 'download';
      os: PlatformOS;
      primary: DownloadOption;
      alternatives: DownloadOption[];
      /** Set when the visitor's CPU has no matching build. */
      archMismatch: DetectedArch | null;
    }
  /** A desktop OS with no package in the release (e.g. macOS today). */
  | { kind: 'unavailable'; os: PlatformOS }
  /** Phones, tablets, ChromeOS: not a platform animaEngine runs on. */
  | { kind: 'not-desktop'; os: Detection['os'] }
  | { kind: 'unknown' };

function archMatches(option: DownloadOption, arch: DetectedArch): boolean {
  if (option.arch === 'universal') return true;
  if (arch === 'x86_64') return option.arch === 'x86_64';
  if (arch === 'arm64') return option.arch === 'aarch64';
  if (arch === 'arm') return option.arch === 'armv7';
  return false;
}

function preferredFormats(os: PlatformOS, detection: Pick<Detection, 'linuxFamily'>): Format[] {
  if (os === 'linux') {
    if (detection.linuxFamily === 'debian') return ['deb', 'appimage', 'flatpak', 'tarball', 'rpm'];
    if (detection.linuxFamily === 'fedora') return ['rpm', 'appimage', 'flatpak', 'tarball', 'deb'];
    return ['appimage', 'flatpak', 'tarball', 'deb', 'rpm'];
  }
  if (os === 'windows') return ['installer', 'msi', 'zip'];
  return ['dmg', 'pkg', 'zip'];
}

/**
 * Chooses what to suggest. Never starts anything: the result only decides
 * which button is shown first. `detection.os` may come from detection or from
 * the visitor's own choice of platform.
 */
export function recommend(downloads: DownloadsByOS, detection: Detection): Recommendation {
  const { os, arch } = detection;
  if (os === 'unknown') return { kind: 'unknown' };
  if (os !== 'linux' && os !== 'windows' && os !== 'macos') return { kind: 'not-desktop', os };

  const options = downloads[os];
  if (options.length === 0) return { kind: 'unavailable', os };

  const matching = arch === 'unknown' ? options : options.filter((o) => archMatches(o, arch));
  // No build for this CPU: still offer what exists, flagged, rather than nothing.
  const pool = matching.length > 0 ? matching : options;
  const archMismatch = arch !== 'unknown' && matching.length === 0 ? arch : null;

  const order = preferredFormats(os, detection);
  const rank = (o: DownloadOption) => {
    const i = order.indexOf(o.format);
    return i === -1 ? order.length : i;
  };
  const primary = [...pool].sort((a, b) => rank(a) - rank(b))[0];
  if (!primary) return { kind: 'unavailable', os };

  return {
    kind: 'download',
    os,
    primary,
    alternatives: options.filter((o) => o.id !== primary.id),
    archMismatch,
  };
}
