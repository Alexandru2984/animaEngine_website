# animaEngine website — design system

## Concept: the dusk desktop

animaEngine puts animated characters on a desktop. The site *is* that desktop: animaEngine's
own default wallpaper — a violet dusk sky over two hills, the scene of its welcome screen and
of every recording — with the app's built-in characters living on it. They fall in, walk,
hop, answer a click and doze when the visitor leaves them alone, which is what they do in the
app.

The scenes are the only decoration. Everything between them is quiet and typographic:
rules instead of boxes, tables for comparisons, lists for lists, real recordings for proof.

Principles:

1. **Show the product doing its job.** Motion on the page is animaEngine's own behaviour
   with animaEngine's own sprite sheets — never decoration for its own sake.
2. **One world, one bold place.** The hero is the memorable thing. Inner pages carry the
   same dusk as a header band with the hills as its lower edge, and nothing louder.
3. **Structure is information.** No card grids, eyebrow labels, pill badges or icon tiles.
   Numbers appear only where order matters (the rendering pipeline).
4. **The app's voice.** Plain, warm, specific sentences; sentence case everywhere.
5. **Every motion stops when unseen**, and reduced motion keeps the same layout, still.

## Colour

Sampled from `site-assets/screenshots/desktop.png` (sky `#4C3B75`–`#584391`, far hill
`#423278`, near hill `#32275B`), deepened where text sits on it.

| Token | Hex | Role |
|---|---|---|
| `--night` | `#15102a` | Page background |
| `--dusk` | `#1d1638` | Raised bands, panels |
| `--sky-top` → `--sky-low` | `#231a45` → `#4a3a7c` | The sky; `--sky-top` is also the header |
| `--hill-far` | `#3a2c6a` | Far hill |
| `--hill-near` | `#261d4d` | Near hill, and the ground sections continue from |
| `--line` / `--line-soft` | `#3a3166` / `#2a2250` | Rules and borders |
| `--moon` | `#f3efff` | Text |
| `--haze` | `#c0b8e0` | Secondary text |
| `--mist` | `#a69dcc` | Tertiary text, captions |
| `--violet` | `#ad9bff` | Links, focus-adjacent accents (the icon's violet, lightened) |
| `--star` | `#f6c453` | **The one warm accent:** primary action, current page, focus ring — from the star character |
| `--star-ink` | `#1f1633` | Text on `--star` |

Status colours (`--stable`, `--optin`, `--experimental`, `--planned`, `--unsupported`,
`--neutral`) appear only as text with a small dot; planned and not-published use a hollow dot.

Measured contrast (WCAG): `--moon` on `--night` 16.3:1; `--haze` 9.8:1; `--mist` 7.3:1;
`--violet` 7.8:1; `--star` 11.4:1; `--star-ink` on `--star` 10.6:1. On the hills
(`--hill-near`) the lowest is `--mist` at 6.1:1. Every status colour is above 7.8:1 on
`--night`.

Browser surfaces are themed too: selection (`--violet` with `--star-ink`), caret, scrollbar
and `accent-color`.

## Typography

| Role | Family | Use |
|---|---|---|
| Display | **Bricolage Grotesque** (variable, optical size + weight; self-hosted) | Headings, figures, names |
| Text | **Atkinson Hyperlegible Next** (variable weight; self-hosted) | Body, UI, tables |
| Code | System monospace | Code, file names, commands only |

Bricolage's slightly irregular grotesque shapes carry the playful-but-precise character of
the app; Atkinson Hyperlegible was designed for readers with low vision, which matches an
app that takes screen readers and high-contrast themes seriously. Only the Latin subsets
load on English pages (preloaded): 77 KB + 34 KB.

Scale (`--t-*`): xs 13 px · sm 15 px · md 17 px (body) · lg 20 px · xl 25 px ·
2xl 30–42 px · 3xl 38–60 px · hero 42–70 px. Headings: weight 720–760, tracking −0.01 to
−0.028em, balanced wrapping, line height 1.0–1.2. Body: 1.6 line height, measure ≤ 66–70ch.

## Space and layout

- Spacing scale `--s-1`…`--s-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 144 px.
- Container 1200 px + fluid gutter `clamp(16px, 4vw, 40px)`.
- Composition uses a 12-column feel without a grid framework: 4/8 for label + content rows
  (downloads, feature sections, docs list), 5/7 alternating for the feature acts.
- Section rhythm `clamp(72px, 10vw, 136px)`; intros max 40rem.
- Sections change shape on purpose: full-bleed scene, alternating acts, a model sheet on a
  dusk band, a table, a frame strip, a closing band with a ledge.

## Surfaces, shape and controls

- Rules (`1px` `--line`) separate content; there are no cards. The only panels are the
  download recommendation and the clip/preview frames.
- Radii: 10 px controls, 12 px media frames. Nothing else is rounded.
- Buttons: 48 px tall (40 px small). Primary = `--star` fill; secondary = 1.5 px light
  outline. One primary per view, plus the small one in the header.
- Navigation: the header is the desktop's top bar (`--sky-top`); the current page is
  marked with a 2 px `--star` underline.
- Focus: 2 px `--star` outline, 3 px offset, on everything focusable.

## Motion

Timing: 120 ms (feedback), 200 ms (state), 360 ms (reveal). Easing
`cubic-bezier(0.16, 1, 0.3, 1)` out; no bounce curves in UI.

**The one authored moment:** on the homepage the characters fall onto the hills (their real
fall animation), land with a short squash, then go about their day.

### The character stage system

- `src/lib/stage/hills.ts` — the hills as functions. The same function draws the SVG at
  build time and tells characters where the ground is at run time.
- `src/lib/stage/actor.ts` — a pure state machine per character (`falling → landing → idle
  ⇄ walking / hop`, `drifting` for floaters, `sleeping`), simple physics (gravity
  2200 px/s², hop 520 px/s) and frame selection. No DOM, clock or `Math.random`: tested in
  `tests/stage.test.ts`.
- `src/scripts/stage.ts` — DOM sprites (a box whose background is the sprite sheet, moved
  with `transform`), one `requestAnimationFrame` loop per stage that runs only while the
  stage is on screen, the tab is visible and someone is awake. Frames advance at the sheet's
  pace (idle 8 fps, walk 10, fall 12); unchanged values are never written.
- Characters avoid elements marked `data-stage-avoid` (the hero copy), never cover links or
  buttons, and receive pointer events only on themselves.
- A click: a hop and a speech bubble (white with dark text, as in the app).
- 45 s without input: everyone dozes (sleep drawing, "Zzz…"), and the loop stops. Any input
  wakes them with a hop.
- Small screens (< 720 px): three walkers, no floaters, smaller sizes.
- Reduced motion: characters stand still in their idle pose; a click still shows the bubble.
- Sprite sheets are the app's own (`site-assets/characters/*-sheet.png`, 12 × 256 px),
  re-encoded at build time to WebP with 160 px frames (~27 KB each) and loaded after the
  page's `load` event.

Other motion: clips play only while half visible and never under reduced motion; tabs,
buttons and the lightbox use plain state transitions.

## Responsive behaviour

The hero keeps its scene within the first screen down to 600 px of height; below 720 px
wide the copy stacks above a 300 px strip of hills. Row layouts (4/8) collapse to one column
below 760–960 px; tables become stacked rows below 720 px; the header menu becomes a native
`popover` below 880 px.

## Refused patterns

Eyebrow labels, all-caps tracked labels, middle-dot meta strings, arrows appended to links,
identical card grids, nested cards, icon-in-a-tile features, coloured side borders, gradient
text, glow and glass for decoration, random blobs or bokeh, monospace as decoration.

## Assets

From `site-assets/` (never modified): the ten characters' idle/walk/fall/drag sprite sheets
and sleep drawings, the character stills, the four clips (WebP 720p as-is; 720p H.264
derived), five screenshots, the icon, favicon and the English Open Graph image. Not used:
the per-language OG images, the press kit, the group pictures, the 1080p clips and the
animated WebPs (the sheets replace them).
