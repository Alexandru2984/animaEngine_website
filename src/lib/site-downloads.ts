/** Download data for pages, computed once at build time from the manifest. */
import { buildDownloads, pickLatestStable, type DownloadsByOS, type PlatformOS } from './downloads';
import { getManifest, type Release } from './releases';
import { environments, STATUS_LABELS, type SupportStatus } from '../data/platforms';

export interface OSInfo {
  name: string;
  status: SupportStatus;
  statusLabel: string;
  note: string;
}

/** Per-OS status, shared with the client script through the JSON payload. */
export const OS_INFO: Record<PlatformOS, OSInfo> = {
  linux: {
    name: 'Linux',
    status: 'stable',
    statusLabel: STATUS_LABELS.stable,
    note: 'Packages for x86_64. On GNOME and KDE Wayland sessions the overlay runs through XWayland automatically.',
  },
  windows: {
    name: 'Windows',
    status: 'experimental',
    statusLabel: STATUS_LABELS.experimental,
    note:
      environments.find((e) => e.id === 'windows')?.notes ??
      'New in 1.5 and tested under Wine only so far. The files are not signed yet.',
  },
  macos: {
    name: 'macOS',
    status: 'unsupported',
    statusLabel: STATUS_LABELS.unsupported,
    note: environments.find((e) => e.id === 'macos')?.notes ?? 'macOS is not supported.',
  },
};

export interface DownloadContext {
  latest: Release | null;
  downloads: DownloadsByOS;
  releasesUrl: string;
  repository: string;
}

export function getDownloadContext(): DownloadContext {
  const manifest = getManifest();
  const latest = pickLatestStable(manifest.releases);
  return {
    latest,
    downloads: buildDownloads(latest),
    releasesUrl: `https://github.com/${manifest.repository}/releases`,
    repository: manifest.repository,
  };
}

/** What the browser-side download picker receives (see src/scripts/downloads.ts). */
export interface PickerPayload {
  version: string | null;
  releaseUrl: string;
  releasesUrl: string;
  checksumsUrl: string | null;
  downloads: DownloadsByOS;
  os: Record<PlatformOS, OSInfo>;
}

export function pickerPayload(ctx: DownloadContext): PickerPayload {
  return {
    version: ctx.latest?.version ?? null,
    releaseUrl: ctx.latest?.url ?? ctx.releasesUrl,
    releasesUrl: ctx.releasesUrl,
    checksumsUrl: ctx.latest?.checksumsUrl ?? null,
    downloads: ctx.downloads,
    os: OS_INFO,
  };
}

/** Serialises JSON for a non-executed <script type="application/json"> block. */
export function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
