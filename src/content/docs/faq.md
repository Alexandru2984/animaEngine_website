---
title: FAQ and known problems
description: Answers to the questions people ask most about animaEngine, the problems known today, and how to remove it.
order: 5
checkedAgainst: '1.5.1'
sources:
  - label: docs/faq.md
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/faq.md
---

Something not here? [Open an issue](https://github.com/Alexandru2984/animaEngine/issues/new/choose) with the diagnostic report (*Appearance → About → Copy diagnostic report*).

## Using it

### I click a character and nothing happens

Clicks go through the characters to whatever is underneath. To change them, open edit mode — the ⚙ button in the top-right corner, or `Super+Alt+A` (`Win+Alt+A` on Windows). To poke them without it, turn on *Appearance → Characters can be tapped*.

### A picture is refused

It is too large (more than 4096 pixels a side, or more than 256 MB once decoded), in another format, or an MP4 that is not H.264. The message says which. A video is kept to its first 600 frames, about 20 seconds.

### Does it send anything anywhere?

No. It makes no network connection at all. The diagnostic report is copied to your clipboard and goes wherever you paste it, nowhere else.

## Shortcuts

### My shortcuts are still Ctrl+Shift+A, H and P

They were the defaults before 1.5, and a config from then keeps what it has. They clash with VS Code, Firefox and KDE, which is why new installs start on `Super+Alt`. Change them in the Keybindings tab — on GNOME and KDE under Wayland, in the desktop's own shortcut settings.

### Super+Alt+A does nothing on GNOME or KDE under Wayland

Global shortcuts there go through the desktop's shortcuts portal, which asks the first time whether to allow them. Answer the dialog and they work everywhere; if it was dismissed, the desktop asks again at the next start.

## Performance

### It uses my GPU

While characters move, the screen-sized overlay is drawn about sixty times a second. *Appearance → Frames a second while they move* draws thirty instead, always or only on battery, at the same speed. When nothing moves, it wakes a few times a second at most. *Pause when I'm away* holds everything still after the time you pick, and *Pause on battery* while unplugged.

## Known problems

- **Following the cursor on native Wayland** works in edit mode only.
- **Pausing when away under KDE on Wayland** is unavailable on the default path.
- **Stepping aside for full-screen apps under GNOME or KDE on Wayland** sees only XWayland apps.
- **Landing on window edges** sees X11 windows only.
- **On Windows, SmartScreen warns** before the installer or the `.exe` runs, because they are not signed yet: *More info → Run anyway*. The release's `SHA256SUMS` file lets you check the download first.
- **Windows support is new** and has been run under Wine so far, not on a real Windows machine. Reports are very welcome.
- **macOS** is not supported.

See [Linux desktops and Wayland](/docs/linux-desktops/) for the details behind the Linux items.

## Removing it

- `.deb`: `sudo apt remove anima-engine`.
- Flatpak: `flatpak uninstall eu.animaengine.Anima` — add `--delete-data` to remove its settings too.
- AppImage or a build from source: delete the file; `sudo make uninstall` if you used `make install`.
- Windows: *Settings → Apps → animaEngine → Uninstall*. It takes "Start at login" with it.

Except for the Flatpak's `--delete-data`, your settings and characters stay in place for a later install; the [configuration page](/docs/configuration/) lists where they are.
