# animaEngine — site assets

Made by `scripts/site-assets.py` (characters, icons, social, press) and
recorded on the test rig (clips, screenshots). Every file is under 25 MB.
`INDEX.md` lists them with their sizes.

## Clips

WebM first, MP4 for the browsers that want it; the poster shows until it
plays. No sound, so they may autoplay:

```html
<video autoplay muted loop playsinline poster="/clips/tap-poster.jpg" width="1280" height="720">
  <source src="/clips/tap-720p.webm" type="video/webm">
  <source src="/clips/tap.mp4" type="video/mp4">
</video>
```

`desktop` — they walk and float; `tap` — the cat and the heart tapped;
`pickup` — the cat held in edit mode and let fall; `sleep` — a minute away,
they doze, and wake.

## A character walking across the page

`characters/<name>-walk-sheet.png` is the walk's 12 frames in a row, 256 px
each; shown at 128 px for a sharp HiDPI picture:

```html
<div class="walker" aria-hidden="true"></div>
```
```css
.walker {
  width: 128px; height: 128px;
  background: url(/characters/cat-walk-sheet.png) 0 0 / 1536px 128px;
  animation: walk-frames 1.2s steps(12) infinite, walk-across 18s linear infinite;
  position: absolute; bottom: 0;
}
@keyframes walk-frames { to { background-position: -1536px 0; } }
@keyframes walk-across { from { left: -128px; } to { left: 100%; } }
@media (prefers-reduced-motion: reduce) { .walker { animation: none; } }
```

Or, simpler, `<img src="/characters/cat-walk.webp" width="128" height="128" alt="">`
— the animated WebP plays by itself.

## Previews and icons

```html
<meta property="og:image" content="https://animaengine.eu/social/og-en.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/favicon.ico" sizes="48x48">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/icons/site.webmanifest">
```

`social/og-<lang>.png` for each language's pages (`og-pt-BR.png` and the
rest), `og.png` the English one.
