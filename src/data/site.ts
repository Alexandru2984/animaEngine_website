/**
 * Product facts and links used across the site. Every claim here comes from
 * the animaEngine repository (README.md, docs/, ROADMAP.md, LICENSE) as of
 * release 1.5.1; update it together with the app.
 */

export const REPO = 'https://github.com/Alexandru2984/animaEngine';
const BLOB = `${REPO}/blob/main`;

export const site = {
  name: 'animaEngine',
  url: 'https://animaengine.eu',
  tagline: 'Animated characters that live on your desktop',
  description:
    'animaEngine is a free, open-source desktop overlay written in Rust: animated characters walk, bounce and play over your windows while every click passes through. For Linux, with an experimental Windows build.',
  license: { name: 'MIT License', url: `${BLOB}/LICENSE` },
  copyright: 'animaEngine contributors',
  themeColor: '#15131d',
  ogImage: { path: '/social/og.png', width: 1200, height: 630, alt: 'animaEngine: animated characters that live on your desktop' },
} as const;

export const links = {
  repo: REPO,
  releases: `${REPO}/releases`,
  issues: `${REPO}/issues`,
  newIssue: `${REPO}/issues/new/choose`,
  readme: `${BLOB}/README.md`,
  changelogFile: `${BLOB}/CHANGELOG.md`,
  contributing: `${BLOB}/CONTRIBUTING.md`,
  security: `${BLOB}/SECURITY.md`,
  support: `${BLOB}/SUPPORT.md`,
  roadmap: `${BLOB}/ROADMAP.md`,
  docs: {
    config: `${BLOB}/docs/config.md`,
    wayland: `${BLOB}/docs/wayland.md`,
    accessibility: `${BLOB}/docs/accessibility.md`,
    architecture: `${BLOB}/docs/architecture.md`,
    stability: `${BLOB}/docs/stability-policy.md`,
    threatModel: `${BLOB}/docs/threat-model.md`,
    faq: `${BLOB}/docs/faq.md`,
    windows: `${BLOB}/docs/porting-windows.md`,
    flatpak: `${BLOB}/flatpak/README.md`,
    aur: `${BLOB}/packaging/aur/README.md`,
    behaviorExamples: `${BLOB}/docs/examples/behaviors`,
    framePacing: `${BLOB}/docs/blog/2026-06-idle-frame-pacing.md`,
    releaseNotes: (tag: string) => `${BLOB}/docs/release-notes/${tag}.md`,
  },
} as const;

export interface NavItem {
  href: string;
  label: string;
}

export const primaryNav: NavItem[] = [
  { href: '/features/', label: 'Features' },
  { href: '/showcase/', label: 'Showcase' },
  { href: '/docs/', label: 'Docs' },
  { href: '/changelog/', label: 'Changelog' },
];

export const footerNav: { title: string; items: Array<NavItem & { external?: boolean }> }[] = [
  {
    title: 'Product',
    items: [
      { href: '/features/', label: 'Features' },
      { href: '/showcase/', label: 'Showcase' },
      { href: '/download/', label: 'Download' },
      { href: '/changelog/', label: 'Changelog' },
    ],
  },
  {
    title: 'Help',
    items: [
      { href: '/docs/', label: 'Documentation' },
      { href: '/docs/faq/', label: 'FAQ & known problems' },
      { href: links.newIssue, label: 'Report a problem', external: true },
      { href: links.security, label: 'Security policy', external: true },
    ],
  },
  {
    title: 'Project',
    items: [
      { href: links.repo, label: 'Source on GitHub', external: true },
      { href: links.releases, label: 'GitHub Releases', external: true },
      { href: links.contributing, label: 'Contributing', external: true },
      { href: '/privacy/', label: 'Privacy' },
    ],
  },
];
