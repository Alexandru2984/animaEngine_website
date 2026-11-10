---
title: Configuration
description: Where animaEngine keeps its settings, how hot reload works, and the environment variables it reads.
order: 3
checkedAgainst: '1.5.1'
sources:
  - label: README.md — Configuration
    url: https://github.com/Alexandru2984/animaEngine/blob/main/README.md#configuration
  - label: docs/config.md
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/config.md
  - label: docs/faq.md — Where are my settings?
    url: https://github.com/Alexandru2984/animaEngine/blob/main/docs/faq.md#using-it
---

Almost everything can be changed from the settings panel in edit mode. Behind it is one TOML file that you can also edit by hand.

## Where the files are

| Installed as | Settings | Asset library |
|---|---|---|
| a package, an AppImage, from source | `~/.config/animaengine/config.toml` | `~/.local/share/animaengine/assets/` |
| Flatpak | `~/.var/app/eu.animaengine.Anima/config/animaengine/` | `~/.var/app/eu.animaengine.Anima/data/animaengine/assets/` |
| Windows | `%APPDATA%\animaEngine\config\config.toml` | `%APPDATA%\animaEngine\data\assets\` |

## Editing by hand

The file can be edited while the app runs: it is checked every two seconds and reloaded off the UI thread. An excerpt:

```toml
[global]
always_on_top = true
transparent = true
playback_enabled = true
window_width = 0    # 0 = auto from monitor
window_height = 0

[[characters]]
id = "slime"
name = "Slime Demo"
asset_type = "png_sequence"
asset_path = "assets/demo/slime"
x = 600.0
y = 400.0
scale = 1.0
opacity = 1.0
fps = 8.0
visible = true
playing = true
z_index = 20
physics_enabled = false      # G key in edit mode

[characters.behavior]
type = "walk_around"
speed = 80.0
```

Every field is described in [docs/config.md](https://github.com/Alexandru2984/animaEngine/blob/main/docs/config.md). A config written by any 1.x release opens with every value kept; what stays stable across releases — config, D-Bus, CLI, asset formats, file locations — is set out in the [stability policy](https://github.com/Alexandru2984/animaEngine/blob/main/docs/stability-policy.md).

## Starting over and recovering

Quit the app and delete `config.toml`: the next start makes a new one. After a crash, `anima-engine --recover` puts back the scene saved just before it (keeping your config beside it as `config.toml.bak`) and exits; then start the app again.

## Environment variables

| Variable | Effect |
|----------|--------|
| `RUST_LOG=anima_engine=debug` | Verbose logs (default is `info`) |
| `ANIMA_NO_CACHE=1` | Bypass the on-disk cache of decoded frames |
| `ANIMA_USE_WAYLAND_NATIVE=1` | Try the native Wayland (wlr-layer-shell) backend |
| `ANIMA_ASSETS_DIR=<path>` | Use another asset-library folder |
| `ANIMA_MEMORY_BUDGET_MB=<int>` | Raise the budget for decoded frames (default 1024) |
| `__NV_PRIME_RENDER_OFFLOAD=1` | Draw on a laptop's NVIDIA GPU, as `prime-run` does |
