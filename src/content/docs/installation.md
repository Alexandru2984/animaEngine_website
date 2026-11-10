---
title: Installation
description: Install animaEngine from a release package on Linux or Windows, check the download, or build it from source.
order: 1
checkedAgainst: '1.5.1'
sources:
  - label: README.md — Install
    url: https://github.com/Alexandru2984/animaEngine/blob/main/README.md#install
  - label: docs/porting-windows.md
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/porting-windows.md
  - label: flatpak/README.md
    url: https://github.com/Alexandru2984/animaEngine/blob/main/flatpak/README.md
---

Every [GitHub release](https://github.com/Alexandru2984/animaEngine/releases) carries a `.deb`, an AppImage, a Windows installer and a portable Windows ZIP, with a `SHA256SUMS` file listing their checksums. The [download page](/download/) links to the files of the latest release.

## Check what you downloaded

Compare the file with the release's checksum list before you run it. GitHub also attests where each file was built.

```bash
sha256sum -c --ignore-missing SHA256SUMS-v1.5.1.txt
# gh 2.49 or newer — a distribution's may be older: cli.github.com
gh attestation verify anima-engine_1.5.1-1_amd64.deb --repo Alexandru2984/animaEngine
```

## Linux

### Debian and Ubuntu (.deb)

```bash
sudo apt install ./anima-engine_1.5.1-1_amd64.deb
```

To remove it again: `sudo apt remove anima-engine`.

### AppImage (most distributions)

```bash
chmod +x animaEngine-1.5.1-x86_64.AppImage
./animaEngine-1.5.1-x86_64.AppImage
```

To remove it, delete the file.

### Flatpak (built locally)

animaEngine is **not on Flathub yet**. The repository contains a Flatpak manifest: `make flatpak` builds a bundle (see [flatpak/README.md](https://github.com/Alexandru2984/animaEngine/blob/main/flatpak/README.md)), whose runtime comes from Flathub:

```bash
flatpak remote-add --user --if-not-exists flathub \
    https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user build/eu.animaengine.Anima.flatpak
flatpak run eu.animaengine.Anima
```

### Arch Linux

A `PKGBUILD` lives in the repository under `packaging/aur/`; the AUR package has not been published yet.

## Windows (experimental)

From 1.5, each release also carries a Windows installer and a portable ZIP, both for x86_64.

- The **installer** needs no administrator rights, installs for you alone and is removed from *Settings → Apps*.
- The **ZIP** runs from any folder.

Neither is signed yet, so SmartScreen asks before running them: choose *More info → Run anyway* once you have checked the download. Windows support is new and has so far been tested under Wine only, not on a real Windows machine — [reports are very welcome](https://github.com/Alexandru2984/animaEngine/issues/new/choose).

## macOS

macOS is not supported.

## From source

You need Rust 1.88 or newer, from [rustup](https://rustup.rs) — a distribution's own `rustc` is often older (Ubuntu 24.04's is 1.75).

The binary links two system libraries, xkbcommon and ALSA (for script sounds), and the C++ runtime of its H.264 decoder. Vulkan, OpenGL, X11 and Wayland are opened at run time, so their headers are not needed. `pkg-config` finds the two libraries; it is not part of `build-essential`.

```bash
# Ubuntu, Debian
sudo apt install -y build-essential pkg-config libxkbcommon-dev libasound2-dev
# Fedora
sudo dnf install -y gcc gcc-c++ pkgconf-pkg-config libxkbcommon-devel alsa-lib-devel
# Arch
sudo pacman -S --needed base-devel libxkbcommon alsa-lib

# Build and run
cargo build --release
./target/release/anima_engine
```

To install it as `anima-engine`, with its menu entry and icons (drawn by `rsvg-convert`, from librsvg):

```bash
make icons && sudo make install      # under /usr/local
make install PREFIX=$HOME/.local     # or for you alone
sudo make uninstall                  # and back out
```

`--no-default-features` builds without video (the OpenH264 decoder) and without sound (ALSA); `--features video` or `--features audio` puts one back.
