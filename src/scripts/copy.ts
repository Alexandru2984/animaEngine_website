/**
 * Copy buttons ([data-copy-target] → id of the element whose text to copy).
 * Uses the async Clipboard API; when it is unavailable or refused, selects the
 * text so it can be copied by hand. Works for buttons added later too.
 */

const status = (() => {
  const el = document.createElement('div');
  el.className = 'visually-hidden';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.append(el);
  return el;
})();

function selectText(el: Element) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function copy(button: HTMLButtonElement) {
  const target = document.getElementById(button.dataset.copyTarget ?? '');
  if (!target) return;
  const text = (target.textContent ?? '').trim();
  const label = button.querySelector('[data-copy-text]');
  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    button.setAttribute('data-copied', '');
    if (label) label.textContent = 'Copied';
    status.textContent = 'Copied to the clipboard.';
    window.setTimeout(() => {
      button.removeAttribute('data-copied');
      if (label) label.textContent = 'Copy';
      status.textContent = '';
    }, 2000);
  } catch {
    selectText(target);
    status.textContent = 'Selected. Press Ctrl+C to copy.';
  }
}

export function enableCopyButtons(root: ParentNode = document) {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy-target]')) button.hidden = false;
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-copy-target]');
  if (button) void copy(button);
});

enableCopyButtons();
