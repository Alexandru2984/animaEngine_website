import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Hand-written guides, adapted from the animaEngine repository's docs. */
const docs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().int(),
    /** The upstream document(s) this page is based on. */
    sources: z.array(z.object({ label: z.string(), url: z.url() })).min(1),
    /** The animaEngine release the page was checked against. */
    checkedAgainst: z.string(),
  }),
});

/** Release notes, generated from GitHub Releases by scripts/sync-releases.mjs. */
const changelog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/changelog' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    tag: z.string(),
    publishedAt: z.iso.datetime(),
    prerelease: z.boolean(),
    url: z.url(),
  }),
});

export const collections = { docs, changelog };
