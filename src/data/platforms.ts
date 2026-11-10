/**
 * Where animaEngine runs, and how well. Source: README.md ("Wayland",
 * "Windows"), docs/faq.md ("Known problems"), ROADMAP.md ("Non-goals",
 * "Candidates for 1.6"), docs/porting-windows.md. Status describes 1.5.1.
 *
 * A platform is listed as supported only when the project says so; a logo or
 * a build target alone is not support.
 */

export type SupportStatus = 'stable' | 'opt-in' | 'experimental' | 'not-published' | 'unsupported';

export const STATUS_LABELS: Record<SupportStatus, string> = {
  stable: 'Stable',
  'opt-in': 'Opt-in',
  experimental: 'Experimental',
  'not-published': 'Build it yourself',
  unsupported: 'Not supported',
};

export interface PlatformRow {
  id: string;
  name: string;
  detail: string;
  status: SupportStatus;
  notes: string;
}

export const environments: PlatformRow[] = [
  {
    id: 'linux-x11',
    name: 'Linux · X11',
    detail: 'Any desktop on an X server',
    status: 'stable',
    notes: 'The default backend. Every feature works here, including following the cursor outside edit mode.',
  },
  {
    id: 'linux-gnome-kde-wayland',
    name: 'Linux · GNOME and KDE on Wayland',
    detail: 'Runs through XWayland, automatically',
    status: 'stable',
    notes:
      'These desktops do not offer layer-shell, so the overlay uses XWayland with no flag needed. Full-screen detection and window-edge landing see XWayland apps only, and “pause when away” is unavailable under KDE on Wayland.',
  },
  {
    id: 'linux-wlroots',
    name: 'Linux · native Wayland',
    detail: 'sway, Hyprland, river, Wayfire (wlroots)',
    status: 'opt-in',
    notes:
      'Start with `ANIMA_USE_WAYLAND_NATIVE=1` for a true layer-shell overlay. Feature parity with X11, except that following the cursor works in edit mode only. Global shortcuts are bound in the compositor.',
  },
  {
    id: 'windows',
    name: 'Windows · x86_64',
    detail: 'Installer or portable ZIP, new in 1.5',
    status: 'experimental',
    notes:
      'Built and tested under Wine so far, not yet on a real Windows machine. The files are not signed yet, so SmartScreen asks before running them. Reports are very welcome.',
  },
  {
    id: 'macos',
    name: 'macOS',
    detail: 'No build',
    status: 'unsupported',
    notes:
      'Not supported, and not scheduled: the engine relies on Linux desktop interfaces and the maintainer has no Mac to test on. A port is welcome as a community contribution.',
  },
];

export interface PackageRow {
  name: string;
  status: SupportStatus;
  text: string;
  href?: string;
}

/** Install channels on Linux. Only .deb and AppImage are published per release. */
export const linuxPackages: PackageRow[] = [
  { name: '.deb (amd64)', status: 'stable', text: 'Published with every release, for Debian, Ubuntu and derivatives.' },
  { name: 'AppImage (x86_64)', status: 'stable', text: 'Published with every release, one file for most distributions.' },
  {
    name: 'Flatpak',
    status: 'not-published',
    text: 'The manifest is in the repository and builds locally with `make flatpak`; it is not on Flathub yet.',
  },
  {
    name: 'AUR',
    status: 'not-published',
    text: 'A PKGBUILD is in the repository; the AUR package has not been published yet.',
  },
  { name: 'From source', status: 'stable', text: '`cargo build --release` with Rust 1.88 or newer and two system libraries.' },
];
