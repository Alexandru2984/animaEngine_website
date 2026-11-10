import { z } from 'astro/zod';
import rawManifest from '../data/releases.json';
import { compareVersions } from './release-manifest.js';

const assetSchema = z.object({
  name: z.string().min(1),
  url: z.url().startsWith('https://github.com/'),
  size: z.number().int().nonnegative(),
  contentType: z.string().nullable(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
});

const releaseSchema = z.object({
  tag: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  publishedAt: z.iso.datetime(),
  prerelease: z.boolean(),
  url: z.url().startsWith('https://github.com/'),
  checksumsUrl: z.url().nullable(),
  assets: z.array(assetSchema),
});

export const manifestSchema = z.object({
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  syncedAt: z.iso.datetime(),
  releases: z.array(releaseSchema),
  tagsWithoutRelease: z.array(z.string()),
});

export type ReleaseAsset = z.infer<typeof assetSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type ReleaseManifest = z.infer<typeof manifestSchema>;

/**
 * Validates manifest data. An invalid manifest fails the build rather than
 * publishing broken download links.
 */
export function parseManifest(data: unknown): ReleaseManifest {
  const result = manifestSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`src/data/releases.json is invalid: ${result.error.message}`);
  }
  return {
    ...result.data,
    releases: [...result.data.releases].sort((a, b) => compareVersions(b.version, a.version)),
  };
}

let cached: ReleaseManifest | undefined;

/** The committed manifest, validated once per build. */
export function getManifest(): ReleaseManifest {
  cached ??= parseManifest(rawManifest);
  return cached;
}
