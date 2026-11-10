# animaEngine website

The source of **[animaengine.eu](https://animaengine.eu)**, the official website of
[animaEngine](https://github.com/Alexandru2984/animaEngine) — a Rust desktop overlay
that puts animated characters on Linux (and, experimentally, Windows) desktops.

The site is built with [Astro](https://astro.build) as static files and served by
[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).
There is no server, no database, no tracking and no third-party script. One tiny Worker
handles byte-range requests for the video clips (see [Why there is a Worker](#why-there-is-a-worker));
everything else is plain files.

## Contents

- [What is in the site](#what-is-in-the-site)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Architecture](#architecture)
- [Downloads and GitHub Releases](#downloads-and-github-releases)
- [When animaEngine releases a new version](#when-animaengine-releases-a-new-version)
- [Content](#content)
- [Assets](#assets)
- [Deploying to Cloudflare](#deploying-to-cloudflare)
- [Custom domain and www redirect](#custom-domain-and-www-redirect)
- [Testing and checks](#testing-and-checks)
- [Security](#security)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Known limitations](#known-limitations)

## What is in the site

| Route | Purpose |
|---|---|
| `/` | Homepage: hero with a real recording, features, clip showcase, compatibility, architecture, download section |
| `/features/` | Every shipped feature, grouped, plus the supported file formats |
| `/showcase/` | The four product clips, the screenshots (with a lightbox) and the ten built-in characters in all their states |
| `/download/` | Suggested download for the visitor's system, every file of the latest release with SHA-256, verify and install steps |
| `/docs/` | Documentation landing page; guides under `/docs/<slug>/` |
| `/changelog/` | Release notes of every GitHub release, newest first |
| `/privacy/` | What the app and the website collect (nothing) |
| `/404` | Custom not-found page (`dist/404.html`, served with status 404) |
| `/sitemap.xml`, `/robots.txt` | For search engines |

All public content is in English. Every product claim comes from the animaEngine
repository (README, `docs/`, `ROADMAP.md`, release notes) as of release 1.5.1; the
source of each data file is noted at its top.

## Requirements

- **Node.js 22.22 or newer** and npm. Development only — production needs no Node.
- **Optional:** `ffmpeg` (with libx264), only to regenerate the derived clips
  (`npm run assets:derive`). A normal build does not need it.
- **For deploying:** a Cloudflare account with access to the `animaengine.eu` zone.

Astro is pinned to **7.4.1**, the newest release whose `engines` accept Node 22.22.
Astro 7.4.2 and later require Node 22.23.4 or newer; after upgrading Node, run
`npm install astro@^7.4` to move to the latest 7.4.x.

## Getting started

```bash
npm install
npm run dev          # http://localhost:4321
```

The dev server serves the site with hot reload. It does not apply `_headers` or the
range Worker; use `npm run preview` for a production-like run.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server with hot reload |
| `npm run build` | Static production build into `dist/` |
| `npm run preview` | Build, then serve `dist/` through `wrangler dev` (real Workers runtime, `_headers`, 404 handling, range Worker) at http://localhost:8787 |
| `npm run preview:astro` | Serve `dist/` with Astro's simple static server |
| `npm run check` | Type-check `.astro`, `.ts` and the JSDoc-typed `.js`/`.mjs` files (`astro check`) |
| `npm test` | Unit tests (Vitest) |
| `npm run verify:dist` | Checks the built `dist/` (links, anchors, asset references, CSP compatibility, SEO tags, file-size limits) |
| `npm run validate` | `check` + `test` + `build` + `verify:dist` — run before every deploy |
| `npm run releases:sync` | Refresh release data from the GitHub Releases API |
| `npm run assets:derive` | Regenerate the derived files from `site-assets/` |
| `npm run deploy:dry-run` | Build, verify, and bundle the Worker without uploading anything |
| `npm run deploy` | Build, verify and deploy to Cloudflare (needs `wrangler login`) |

## Architecture

```
astro.config.mjs        static output, trailing slashes, no inline CSS/JS
wrangler.jsonc          Cloudflare Workers Static Assets configuration
worker/                 the range-request Worker (video files only)
public/                 files served at fixed URLs: _headers, robots.txt, icons, OG image
site-assets/            original assets, never modified (see "Assets")
scripts/                maintenance scripts (plain Node ESM, no TypeScript loader needed)
  sync-releases.mjs     GitHub Releases -> src/data/releases.json + src/content/changelog/
  derive-assets.mjs     site-assets -> public/ copies and 720p H.264 clips
  verify-dist.mjs       post-build checks
src/
  content.config.ts     content collections: docs, changelog
  content/docs/         hand-written guides (Markdown)
  content/changelog/    release notes (generated — do not edit)
  data/                 product facts: site.ts, features.ts, platforms.ts, architecture.ts, media.ts, releases.json
  lib/                  logic: os-detect.ts, downloads.ts, releases.ts, release-manifest.js, …
  components/           Astro components (one per UI piece)
  layouts/              BaseLayout (head, SEO, header, footer), DocsLayout
  pages/                one file per route
  scripts/              small client scripts (bundled, no framework)
  styles/global.css     design tokens and base styles
tests/                  Vitest unit tests
```

Key decisions:

- **Static first.** Every page is prerendered. The browser downloads about 15 KB of
  JavaScript in total, split per page; nothing is hydrated by a framework.
- **Progressive enhancement.** Without JavaScript every page works: clips have native
  controls, the clip list uses links and CSS `:target`, the download page lists every
  file with direct links, and the mobile menu is a native `popover`. Scripts add OS
  detection, the play/pause buttons, tabs, the lightbox and the character explorer.
- **Content separate from presentation.** Product facts live in `src/data/*.ts` and
  Markdown in `src/content/`; components only render them.
- **No inline code.** Astro is configured to emit every script and stylesheet as a
  hashed file, Markdown code is highlighted with Prism (classes, not inline styles),
  and data for scripts is passed in non-executed `<script type="application/json">`
  blocks. This keeps the CSP at `script-src 'self'; style-src 'self'`.
- **Dark only,** using the dark palette from `site-assets/press/colours.json`.
  The typeface is Manrope (variable, self-hosted from `@fontsource-variable/manrope`;
  the Latin subset is 25 KB and preloaded).

### Why there is a Worker

Cloudflare Workers Static Assets answers a `Range` request with the whole file and
status 200. Safari, and every browser on iOS, will not play a `<video>` unless the
server answers `Range: bytes=0-1` with `206 Partial Content`. Without help the clips
would not play there.

`worker/index.ts` (about 30 lines, plus `worker/range.ts`) runs **only** for
`/_astro/*.mp4` and `/_astro/*.webm` (`assets.run_worker_first` in `wrangler.jsonc`).
It fetches the file from the `ASSETS` binding and returns the requested bytes. All
other requests are served by the asset layer without invoking any code, and keep
the headers from `_headers` (the binding applies them to the video responses too).

If Cloudflare adds range support to static assets, delete `main`, `assets.binding`
and `assets.run_worker_first` from `wrangler.jsonc` and remove `worker/`.

## Downloads and GitHub Releases

The download buttons link straight to files on
[GitHub Releases](https://github.com/Alexandru2984/animaEngine/releases). The site
never calls GitHub at runtime; it builds from a committed manifest:

1. `npm run releases:sync` calls the public GitHub REST API
   (`/repos/Alexandru2984/animaEngine/releases` and `/tags`, with pagination),
   skips drafts, downloads each release's `SHA256SUMS-<tag>.txt`, and cross-checks
   every digest against GitHub's own `digest` field — a mismatch aborts the sync.
2. It writes `src/data/releases.json` (versions, files, sizes, SHA-256, URLs) and one
   Markdown file per release into `src/content/changelog/`. Relative links in the
   release notes are rewritten to the repository at that tag.
3. The build validates the manifest with a schema (`src/lib/releases.ts`); a manifest
   with links outside `https://github.com/` or malformed digests fails the build.

On a network error, an API error or a rate limit, the sync prints the reason and
changes nothing. An empty release list is refused unless `--allow-empty` is passed.
`GITHUB_TOKEN` (optional) raises the API limit from 60 to 5,000 requests an hour;
`--dry-run` shows what would change.

How files are matched to platforms (`src/lib/downloads.ts`):

| File | Platform | Shown as |
|---|---|---|
| `*.AppImage` | Linux | AppImage (suggested on Linux) |
| `*.deb` | Linux | .deb package (suggested when the browser reveals a Debian-family distribution) |
| `*windows*-setup.exe` | Windows | Installer (suggested on Windows) |
| `*windows*.zip` | Windows | Portable ZIP |
| `SHA256SUMS*` | — | Checksum list, linked from the download page |

`.rpm`, `.flatpak`, Linux `.tar.*`, `.msi`, `.dmg` and `.pkg` files, and `aarch64`/`arm64`
builds, are recognised too, so a future release that publishes them appears without
code changes. A file whose CPU architecture cannot be told from its name is not offered.

The latest stable release is the highest semantic version that is not a pre-release
and has at least one installable file. If there is none, the download page says so and
links to GitHub Releases. A platform without a file in the release (macOS today) shows
an explanation instead of a button.

**OS detection** (`src/lib/os-detect.ts`) uses User-Agent Client Hints where the browser
offers them (Chromium), including the CPU architecture, and falls back to the User-Agent
string. Android, iOS/iPadOS (including iPads that report "Macintosh") and ChromeOS are
told apart from desktop systems. The result only chooses which file is suggested first;
nothing is downloaded until the visitor clicks, and every file stays listed. Visitors can
switch systems by hand.

## When animaEngine releases a new version

1. Publish the GitHub release with its files and `SHA256SUMS-<tag>.txt` as usual.
2. In this repository:
   ```bash
   npm run releases:sync
   git diff --stat            # releases.json and a new changelog entry
   npm run validate
   ```
3. Review what the release changes on the site and update the hand-written parts:
   - `src/data/features.ts` — new or changed features;
   - `src/data/platforms.ts` — support status (e.g. Windows leaving "experimental",
     Flatpak or AUR becoming published);
   - `src/lib/site-downloads.ts` (`OS_INFO`) — per-platform notes on the download page;
   - `src/content/docs/*.md` — commands that name a version (installation guide) and
     `checkedAgainst` in each page's front matter;
   - the "1.5.1" mentions in `src/pages/features.astro` and `src/pages/docs/index.astro`.
4. Commit, then `npm run deploy` (after approval).

The download page, the homepage download section, the version shown in the hero and
the changelog all update from the manifest automatically.

## Content

- **Docs** are Markdown files in `src/content/docs/` with `title`, `description`, `order`,
  `sources` (links to the upstream documents) and `checkedAgainst` (the release they were
  checked against). They are adapted from the animaEngine repository; the repository stays
  the reference, and each page says so.
- **Changelog** entries are generated — edit the release on GitHub and re-sync instead.
- **Features, platforms, architecture** are typed data in `src/data/`. Strings may use
  `backticks` for code; `InlineText.astro` renders them as `<code>`.
- **Benchmarks:** `src/data/architecture.ts` has an empty `benchmarks` list. Add an entry
  only with a reproducible method and a public source; the homepage shows a table as soon
  as the list is not empty.

## Assets

`site-assets/` holds the original assets (characters, clips, screenshots, icons, social
previews, press kit). **They are never modified or renamed.** Only what the site uses ends
up in the build:

- Screenshots, posters and character drawings are imported from `site-assets/` in
  `src/data/media.ts` and optimised by Astro at build time (AVIF/WebP at several widths,
  JPEG fallback); unused originals are not emitted.
- The clips' WebM (VP9, 720p) files are used as they are. `npm run assets:derive` makes
  720p H.264 MP4s (`src/assets/derived/clips/`, about half the size of the provided
  1080p MP4s); they are offered first, with the WebM as an alternative for browsers
  without H.264.
- Files that need a stable URL (favicon, icons, web manifest, the Open Graph image) are
  copied by the same script into `public/`.
- Derived files are committed, so a build needs no ffmpeg. The press kit, the per-language
  Open Graph images, the sprite sheets other than the cat's, the 1080p clips and the group
  pictures are not used.

Every built file is far below Cloudflare's 25 MiB per-file limit (the largest is about
230 KB); `verify:dist` enforces the limit. Installers are never part of the site — they
are downloaded from GitHub.

## Deploying to Cloudflare

The Worker is named `animaengine-website` and targets Workers Static Assets (not Pages).

```bash
npx wrangler login            # once, opens the browser
npm run deploy:dry-run        # build, verify, bundle; uploads nothing
npm run deploy                # build, verify, upload
```

The first deploy makes the site available at
`https://animaengine-website.<your-subdomain>.workers.dev`. Check it there, then attach
the custom domain.

`compatibility_date` is `2026-11-10`. `observability` is off because the Worker runs
only for video requests and logs nothing; turn it on in `wrangler.jsonc` if needed.

## Custom domain and www redirect

`animaengine.eu` is the canonical host: every page's `<link rel="canonical">`, the
sitemap and the Open Graph URLs use it.

**Attach the apex domain** (the `animaengine.eu` zone is already on Cloudflare):

- Dashboard: *Workers & Pages → animaengine-website → Settings → Domains & Routes →
  Add → Custom domain →* `animaengine.eu`. Cloudflare creates the DNS record and the
  certificate.
- Or in `wrangler.jsonc`, uncomment the `routes` block
  (`{ "pattern": "animaengine.eu", "custom_domain": true }`) and run `npm run deploy`.

A custom domain cannot be attached while another DNS record exists for the same name;
remove a conflicting `A`/`AAAA`/`CNAME` for `animaengine.eu` first (for example, one
left from GitHub Pages).

**Redirect `www.animaengine.eu` to the apex** with a zone rule, not with the Worker:

1. DNS: add a proxied record for `www` (for example `AAAA www 100::`, proxied), so
   requests reach Cloudflare.
2. *Rules → Redirect Rules → Create rule*: when *Hostname equals* `www.animaengine.eu`,
   *Dynamic* redirect to `concat("https://animaengine.eu", http.request.uri.path)`,
   status **301**, *Preserve query string* on.

**Afterwards:** set `"workers_dev": false` in `wrangler.jsonc` and deploy again, so the
site is reachable under one hostname only. Optionally enable *Always Use HTTPS* on the
zone.

Status (10 November 2026): the apex custom domain is attached (`routes` in
`wrangler.jsonc`). The `www` record and redirect rule are set up in the dashboard; *Always Use HTTPS* is on;
`workers_dev` is off in `wrangler.jsonc`.

## Testing and checks

```bash
npm run validate
```

- **Unit tests** (`tests/`, Vitest): OS detection from real User-Agent strings and client
  hints, including failing or hanging hint lookups; asset classification with the real
  1.5.1 file names and future formats; latest-stable selection; the suggestion for every
  kind of system (Linux, Debian-family, Fedora, Windows, macOS, ARM, phones, unknown, no
  release); SHA-256 list parsing and digest cross-checks; manifest normalisation and schema
  validation; release-notes processing; the range Worker's parsing and responses; and
  sanity checks on the committed manifest.
- **`verify:dist`** checks the built site: internal links and `#anchors`, image, video,
  script, stylesheet and CSS `url()` references, URLs inside JSON data, sitemap entries,
  one `<h1>` and the SEO tags on every page, no inline scripts/styles/handlers, no off-site
  assets, file sizes and counts, unreferenced build files.
- **Browser checks** are not automated in this repository. To measure, run
  `npm run preview` and point Lighthouse at `http://localhost:8787/`.

## Security

- **Headers** (`public/_headers`, applied to every response including the videos):
  `Content-Security-Policy` (`default-src 'none'`, everything else `'self'`,
  `frame-ancestors 'none'`, `form-action 'none'`, `base-uri 'none'`),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`,
  `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`, and
  `Strict-Transport-Security: max-age=31536000` (without `includeSubDomains`; add it, and
  consider preload, only once every subdomain is HTTPS).
- In `_headers`, the first rule that sets a header replaces Cloudflare's default and a
  later rule setting the same header **appends** to it. `Cache-Control` is therefore set
  only in path-specific rules.
- No cookies, no storage, no analytics, no third-party requests. External links use
  `rel="noopener noreferrer"`. No secrets are needed to build; `GITHUB_TOKEN` is optional
  and only read by the sync script on your machine.
- If Cloudflare security features that set cookies (such as Bot Fight Mode challenges)
  are enabled on the zone, update the privacy page accordingly.

## Performance

- Static HTML, about 15 KB of JavaScript in total, CSS split per page.
- Images: AVIF/WebP with `srcset`, explicit dimensions, lazy loading below the fold.
- The hero poster and the Latin font file are preloaded.
- Clips are not downloaded until they are about to play: `preload="none"`, played only
  while at least half visible, paused off screen and in background tabs, never
  auto-played under `prefers-reduced-motion`. The hero clip is 86 KB.
- Character animations (animated WebP) load only when chosen in the explorer.
- Caching: `/_astro/*` (content-hashed) `max-age=31536000, immutable`; icons and the OG
  image one day; HTML, `sitemap.xml` and `robots.txt` revalidate on every request.
- CSS animations are limited to the walking cat in the hero and a few transitions; all
  stop under `prefers-reduced-motion`.

## Accessibility

Semantic landmarks and one `<h1>` per page, a skip link, visible focus rings, keyboard
operation everywhere (ARIA tabs with arrow keys, native `<dialog>` lightbox and `popover`
menu with Escape, radio groups in the character explorer), text alternatives for every
clip and screenshot, colour contrast of at least 4.5:1, touch targets of at least 24 px
(most controls 40–48 px), and
`prefers-reduced-motion` support. WCAG 2.2 AA is the target.

## Known limitations

- Release data is a snapshot: a new release appears on the site after
  `npm run releases:sync` and a deploy.
- The documentation pages are adapted from the repository at 1.5.1 and must be reviewed
  for new releases (see the checklist above).
- The site has no language versions, although the app and the press kit cover ten
  languages; only the English Open Graph image is used.
- Without JavaScript the clip list highlights the first clip even when the URL selects
  another one.
- Range support for video is provided by the Worker until Cloudflare's asset layer
  supports it natively.
