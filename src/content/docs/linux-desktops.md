---
title: Linux desktops and Wayland
description: The default X11/XWayland backend, the opt-in native Wayland backend for wlroots compositors, and what each supports.
order: 4
checkedAgainst: '1.5.1'
sources:
  - label: README.md — Wayland
    url: https://github.com/Alexandru2984/animaEngine/blob/main/README.md#wayland
  - label: docs/wayland.md
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/wayland.md
  - label: docs/faq.md — Known problems
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/faq.md#known-problems
---

## Two backends

The default code path uses **winit and X11** — XWayland on Wayland sessions. It is stable and works on every Linux desktop.

An **opt-in native Wayland backend**, built on `wlr-layer-shell-unstable-v1`, gives a true overlay on wlroots compositors: sway, Hyprland, river and Wayfire. It has feature parity with the X11 path, but stays opt-in and wlroots-only:

```bash
ANIMA_USE_WAYLAND_NATIVE=1 anima-engine
```

GNOME and KDE Wayland sessions do not implement layer-shell, so there the overlay uses XWayland automatically — no flag needed.

## Feature matrix

| Feature | X11 / XWayland (default) | Native Wayland (opt-in, wlroots) |
|---------|-------------------------|------------------------------|
| Click-through overlay | stable | stable |
| Tray icon | stable | stable |
| Drag-and-drop assets | stable | stable (in pass-through, drag over the ⚙ corner first) |
| Keyboard input | stable | stable |
| Input methods (CJK) | stable | stable (text-input-v3) |
| Settings panel | stable | stable |
| Multi-monitor distribution | stable | stable |
| Hi-DPI | the panel and characters at the screen's scale factor | each monitor at its own scale, 125 % and 150 % too |
| Global hotkeys | the GlobalShortcuts portal (GNOME, KDE), else XGrabKey | the portal where the compositor has one, else D-Bus and a compositor binding |
| Tapping characters outside edit mode | stable | stable |
| Full-screen apps seen | EWMH (X11 apps) | `wlr-foreign-toplevel-management` |
| Idle time (dozing, welcome back) | GNOME, or a real X server | `ext-idle-notify` (sway, Hyprland) |

## Global shortcuts

On GNOME and KDE under Wayland, global shortcuts go through the desktop's shortcuts portal, which asks once whether to allow them; change or remove them later in the desktop's own settings. On sway, Hyprland or river the app cannot take a key for itself: bind one in the compositor to the app's D-Bus methods. [docs/wayland.md](https://github.com/Alexandru2984/animaEngine/blob/main/docs/wayland.md) has the lines to paste.

## Known limitations

- **Following the cursor on native Wayland** works in edit mode only: outside it the protocol does not tell the app where the cursor is. On X11 and XWayland it works everywhere.
- **Pausing when away under KDE on Wayland**, with the default path, is unavailable: nothing there tells the app how long you have been away. It works under GNOME, on a real X server, and on wlroots compositors with idle notifications.
- **Stepping aside for full-screen apps under GNOME or KDE on Wayland** sees only apps that run through XWayland.
- **Landing on window edges** (physics) sees X11 windows only; under a Wayland session it finds the apps that run through XWayland.

## Laptops with two GPUs

The app draws on the integrated GPU and leaves an NVIDIA GPU asleep, which saves battery and seconds at start and quit. `prime-run anima-engine`, or the desktop's "Launch using Discrete Graphics Card", makes it draw on the NVIDIA GPU instead.
