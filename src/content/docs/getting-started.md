---
title: Getting started
description: Edit mode, adding characters, everyday actions and the supported file formats.
order: 2
checkedAgainst: '1.5.1'
sources:
  - label: README.md — Daily use, Supported assets
    url: https://github.com/Alexandru2984/animaEngine/blob/main/README.md#daily-use
  - label: docs/faq.md — Using it
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/faq.md#using-it
---

## Pass-through and edit mode

animaEngine draws its characters in a transparent overlay that lets every click pass through to whatever is underneath — that is what lets them live on your desktop. Clicking a character therefore does nothing at first.

To change the characters, open **edit mode**: the ⚙ button in the top-right corner of the screen, or `Super+Alt+A` (`Win+Alt+A` on Windows) from anywhere. The first time, a welcome lets you choose which of the built-in characters are on your desktop, the language, and whether the app starts at login.

To poke characters without edit mode, turn on *Appearance → Characters can be tapped*.

## Adding a character

In edit mode:

- drop a PNG, GIF, WebP, JPEG or MP4 — or a folder of PNG frames — on the screen;
- or use *Scene → Add file…*;
- or paste a picture copied anywhere with `Ctrl+V`.

The Library tab lists what is in your asset library, and the presets in the command palette (`Ctrl+K`) add ready-made scenes.

## Everyday actions

| Action | How |
|--------|-----|
| Enter edit mode | Click ⚙ (top-right), or `Super+Alt+A` from anywhere (`Win+Alt+A` on Windows) |
| Add a character | Drag a PNG / GIF / WebP / JPEG / MP4 onto the overlay |
| Move a character | Drag it (edit mode) or use the X/Y sliders; let go mid-swing to throw it |
| Adjust scale / opacity / FPS | Sliders in the settings panel |
| Toggle visibility / playback | `V` / `P` keys, or checkboxes |
| Set behavior | Dropdown in the Inspector (Idle / Walk / Follow cursor / Follow a character / Play tag / Bounded / Bounce / Script) |
| Delete | `Delete`, right-click → Delete, or the trash button in the Scene list |
| Group / ungroup | `Ctrl+G` / `Ctrl+Shift+G` on the selection, or right-click → Group |
| Copy / cut / paste | `Ctrl+C` / `Ctrl+X` / `Ctrl+V`; `Ctrl+V` also pastes a picture copied anywhere |
| Hide overlay | `Super+Alt+H` (global) or the tray menu |
| Snooze | Tray or command palette: 15 minutes, 1 hour or until morning |
| Focus timer | Tray, command palette or the Scene tab |
| Pause animations | `Space` (edit mode), `Super+Alt+P` (global), or the tray |
| Save & quit | `Q` (edit mode), tray → Quit, or close the window |

The full keyboard reference is one key away: press `H` in edit mode to open the Keybindings tab, which shows every shortcut as it is bound and is also where to change one.

## Supported files

| Type | Extensions | Notes |
|------|-----------|-------|
| Static image | `.png`, `.jpg`, `.jpeg` | Single frame |
| Animated PNG | `.png` | Plays every frame, since 1.5.1 |
| Animated GIF | `.gif` | Per-frame delays preserved |
| WebP | `.webp` | Animated and static |
| PNG sequence | folder of `frame_*.png` | Decoded in parallel |
| Sprite sheet | `.png` + `columns` × `rows` | Grid sliced automatically |
| Video | `.mp4`, `.m4v`, `.mov` | H.264 only, audio ignored, capped at about 20 s |

A picture is refused when it is larger than 4096 pixels a side or more than 256 MB once decoded, in another format, or an MP4 that is not H.264; the message says which. A video is kept to its first 600 frames.

Decoded frames are cached on disk under `~/.cache/animaengine/`, so later starts are limited by disk speed. Set `ANIMA_NO_CACHE=1` to skip the cache.
