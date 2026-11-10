/**
 * Technical characteristics. Source: README.md, docs/architecture.md
 * ("Rendering", "Picking the GPU"), docs/faq.md ("Performance"),
 * docs/release-notes/v1.5.0.md ("Lighter"), docs/threat-model.md.
 */

export const stack: { name: string; role: string }[] = [
  { name: 'Rust', role: 'The whole engine, one native binary' },
  { name: 'wgpu', role: 'GPU rendering: Vulkan or OpenGL on Linux; DX12, Vulkan or GL on Windows' },
  { name: 'winit', role: 'Windows and input on X11 and Windows' },
  { name: 'smithay-client-toolkit', role: 'The opt-in native Wayland backend (layer-shell)' },
  { name: 'egui', role: 'The settings panel, with AccessKit for screen readers' },
  { name: 'Rhai', role: 'Sandboxed behaviour scripts' },
];

/** The rendering path, top to bottom, as described in docs/architecture.md. */
export const pipeline: { title: string; text: string }[] = [
  { title: 'Your files', text: 'PNG, APNG, GIF, WebP, JPEG, sprite sheets, MP4 (H.264)' },
  { title: 'Bounded loaders', text: 'Size, byte and frame caps; decoded frames cached on disk' },
  { title: 'Scene', text: 'Characters, behaviours, scripts, physics, schedules' },
  { title: 'wgpu renderer', text: 'Sprite quads with premultiplied alpha, one texture cache per character' },
  { title: 'Overlay window', text: 'Transparent, always on top (or beneath), click-through' },
];

export const performanceFacts: { title: string; text: string }[] = [
  {
    title: 'Draws only when something changes',
    text: 'The scene knows when the next frame is due. With nothing moving, hidden, snoozed or asleep, the overlay wakes a few times a second at most.',
  },
  {
    title: 'Thirty frames a second, if you like',
    text: 'While characters move the overlay draws at display refresh, or at 30 fps — always or only on battery — at the same apparent speed.',
  },
  {
    title: 'Hybrid graphics aware',
    text: 'On a Linux laptop with an NVIDIA GPU beside an integrated one, it draws on the integrated GPU and leaves the NVIDIA one asleep, unless you choose otherwise.',
  },
  {
    title: 'No browser engine',
    text: 'No Electron, no Chromium, no web view: a native program with GPU rendering and small memory needs.',
  },
];

/**
 * Measured results, shown in a table when non-empty. Add an entry only with
 * a reproducible method and a public source (a document in the repository or
 * a release note). Nothing is listed until such data is published.
 */
export interface Benchmark {
  metric: string;
  value: string;
  conditions: string;
  version: string;
  sourceUrl: string;
}

export const benchmarks: Benchmark[] = [];
