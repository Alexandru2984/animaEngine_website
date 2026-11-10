/**
 * Download suggestions. Detects the visitor's system (best effort), then:
 * - labels [data-os-cta] links ("Download for Linux");
 * - marks the matching [data-platform] card as the visitor's;
 * - fills the /download/ picker ([data-download-picker]) with the suggested
 *   file and lets the visitor switch systems by hand.
 * Nothing is downloaded until the visitor clicks a link.
 */
import { ARCH_NAMES, detectPlatform, isDesktop, OS_NAMES, type Detection, type NavigatorLike } from '../lib/os-detect';
import { ARCH_LABELS, recommend, type DownloadOption, type PlatformOS, type Recommendation } from '../lib/downloads';
import { formatBytes } from '../lib/format';
import type { PickerPayload } from '../lib/site-downloads';
import { enableCopyButtons } from './copy';

function slot(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
}

function setText(root: ParentNode, name: string, text: string) {
  const el = slot(root, name);
  if (el) el.textContent = text;
}

function link(href: string, text: string, className?: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (className) a.className = className;
  if (/^https?:/.test(href)) a.rel = 'noopener noreferrer';
  return a;
}

function describeDetection(detection: Detection): string {
  if (detection.os === 'unknown') return 'We could not tell which system you use, so pick one below.';
  const arch = isDesktop(detection.os) && detection.arch !== 'unknown' ? ` (${ARCH_NAMES[detection.arch]})` : '';
  return `You seem to be using ${OS_NAMES[detection.os]}${arch}. Browsers can be wrong about this, so check before you install.`;
}

function renderDownload(
  picker: HTMLElement,
  payload: PickerPayload,
  rec: Extract<Recommendation, { kind: 'download' }>,
): HTMLElement | null {
  const template = picker.querySelector<HTMLTemplateElement>('[data-picker-template]');
  if (!template) return null;
  const node = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
  if (!node) return null;
  const option: DownloadOption = rec.primary;
  const osName = payload.os[rec.os].name;

  setText(node, 'kicker', `animaEngine ${payload.version ?? ''} for ${osName}`.replace(/\s+/g, ' '));
  setText(node, 'title', option.label);
  setText(node, 'summary', option.summary);
  setText(node, 'file', option.fileName);
  setText(node, 'meta', `· ${ARCH_LABELS[option.arch]}`);
  setText(node, 'button', `Download ${option.label}`);
  setText(node, 'size', formatBytes(option.size));
  const anchor = slot(node, 'link') as HTMLAnchorElement | null;
  if (anchor) anchor.href = option.url;

  if (option.sha256) setText(node, 'hash', option.sha256);
  else slot(node, 'hash-row')?.remove();

  const notes: string[] = [];
  if (rec.archMismatch) {
    notes.push(
      `Your processor looks like ${ARCH_NAMES[rec.archMismatch]}, but animaEngine publishes ${ARCH_LABELS[option.arch]} builds only, and they have not been tested on your processor.`,
    );
  }
  if (payload.os[rec.os].status === 'experimental') notes.push(payload.os[rec.os].note);
  if (notes.length > 0) setText(node, 'note', notes.join(' '));
  else slot(node, 'note-row')?.remove();

  const alt = slot(node, 'alt');
  if (alt && rec.alternatives.length > 0) {
    rec.alternatives.forEach((o, i) => {
      if (i > 0) alt.append(', ');
      alt.append(link(`#dl-${o.id}`, `${o.label} (${formatBytes(o.size)})`));
    });
  } else {
    slot(node, 'alt-row')?.remove();
  }
  return node;
}

function renderMessage(picker: HTMLElement, title: string, text: string, links: HTMLAnchorElement[]): HTMLElement | null {
  const template = picker.querySelector<HTMLTemplateElement>('[data-picker-message]');
  const node = template?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
  if (!node) return null;
  setText(node, 'title', title);
  setText(node, 'text', text);
  const holder = slot(node, 'links');
  if (holder) for (const a of links) holder.append(a);
  return node;
}

function renderPicker(picker: HTMLElement, payload: PickerPayload, detection: Detection) {
  const body = picker.querySelector<HTMLElement>('[data-picker-body]');
  if (!body) return;
  const rec = recommend(payload.downloads, detection);
  let node: HTMLElement | null = null;

  if (payload.version === null) {
    node = renderMessage(picker, 'No release to download yet', 'Once a release with installable files is published, it will appear here.', [
      link(payload.releasesUrl, 'GitHub Releases', 'btn btn-small'),
    ]);
  } else if (rec.kind === 'download') {
    node = renderDownload(picker, payload, rec);
  } else if (rec.kind === 'unavailable') {
    const info = payload.os[rec.os];
    node = renderMessage(
      picker,
      info.status === 'unsupported' ? `animaEngine does not run on ${info.name}` : `No ${info.name} package in ${payload.version}`,
      info.status === 'unsupported' ? info.note : 'This release has no file for this system.',
      [link('#downloads-linux', 'Linux downloads', 'btn btn-small'), link(payload.releasesUrl, 'All releases', 'btn btn-small btn-ghost')],
    );
  } else if (rec.kind === 'not-desktop') {
    node = renderMessage(
      picker,
      'animaEngine is a desktop app',
      `It runs on Linux and, experimentally, on Windows — not on ${OS_NAMES[rec.os]}. Open this page on your computer, or choose a system below.`,
      [],
    );
  } else {
    node = renderMessage(picker, 'Choose your system', 'Pick Linux, Windows or macOS below to see the matching file.', []);
  }

  body.replaceChildren(...(node ? [node] : []));
  enableCopyButtons(body);

  const shown = isDesktop(detection.os) ? detection.os : null;
  for (const control of picker.querySelectorAll<HTMLElement>('[data-pick-os]')) {
    control.setAttribute('aria-pressed', String(control.dataset.pickOs === shown));
  }
}

function markPlatformCards(detection: Detection) {
  if (!isDesktop(detection.os)) return;
  for (const card of document.querySelectorAll<HTMLElement>(`[data-platform="${detection.os}"]`)) {
    card.setAttribute('data-detected', '');
    const tag = card.querySelector<HTMLElement>('[data-detected-tag]');
    if (tag) tag.hidden = false;
  }
}

function labelCallToActions(detection: Detection) {
  if (detection.os === 'linux' || detection.os === 'windows') {
    for (const label of document.querySelectorAll<HTMLElement>('[data-os-cta-label]')) {
      label.textContent = `Download for ${OS_NAMES[detection.os]}`;
    }
  }
  const note =
    detection.os === 'windows'
      ? 'The Windows build is new and experimental: tested under Wine so far, not signed yet.'
      : detection.os === 'macos'
        ? 'animaEngine runs on Linux and, experimentally, Windows. macOS is not supported.'
        : null;
  if (!note) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-os-cta-note]')) {
    el.textContent = note;
    el.hidden = false;
  }
}

async function main() {
  const detection = await detectPlatform(navigator as unknown as NavigatorLike);
  labelCallToActions(detection);
  markPlatformCards(detection);

  const picker = document.querySelector<HTMLElement>('[data-download-picker]');
  const dataEl = picker?.querySelector('[data-download-data]');
  if (!picker || !dataEl?.textContent) return;

  let payload: PickerPayload;
  try {
    payload = JSON.parse(dataEl.textContent) as PickerPayload;
  } catch {
    return; // the static list below still works
  }

  const status = picker.querySelector<HTMLElement>('[data-picker-status]');
  if (status) status.textContent = payload.version === null ? 'No downloadable release has been published yet.' : describeDetection(detection);

  renderPicker(picker, payload, detection);

  // Without JavaScript these are links to each system's section of the list;
  // with it they switch the suggestion in place.
  for (const control of picker.querySelectorAll<HTMLAnchorElement>('[data-pick-os]')) {
    control.setAttribute('role', 'button');
    const choose = (event: Event) => {
      event.preventDefault();
      const os = control.dataset.pickOs as PlatformOS | undefined;
      if (!os) return;
      // A manual choice keeps the detected CPU and distribution hints.
      renderPicker(picker, payload, { ...detection, os, source: detection.source });
      if (status) status.textContent = `Showing the download for ${payload.os[os].name}.`;
    };
    control.addEventListener('click', choose);
    // role="button" promises Space works too.
    control.addEventListener('keydown', (event) => {
      if (event.key === ' ') choose(event);
    });
  }
}

void main();
