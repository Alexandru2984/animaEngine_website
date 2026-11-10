/**
 * Upgrades [data-tabs] (ClipShowcase.astro) to an ARIA tab interface. The
 * markup already works without JavaScript — links to each panel, with CSS
 * :target showing the chosen one — so this only adds the roles, the keyboard
 * pattern (arrows, Home, End), and switching without touching the URL.
 * Dispatches "tabs:change" with { panel } on the document.
 */

function select(tabs: HTMLElement[], panels: HTMLElement[], index: number, focus: boolean) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.toggleAttribute('data-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
    const panel = panels[i];
    if (panel) panel.hidden = !selected;
  });
  if (focus) tabs[index]?.focus();
  const panel = panels[index];
  if (panel) document.dispatchEvent(new CustomEvent('tabs:change', { detail: { panel } }));
}

function setup(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-tab-list]');
  const tabs = [...root.querySelectorAll<HTMLElement>('[data-tab]')];
  const panels = tabs.map((tab) => document.getElementById(tab.dataset.tab ?? ''));
  if (!list || tabs.length === 0 || panels.some((p) => p === null)) return;
  const panelEls = panels as HTMLElement[];

  list.setAttribute('role', 'tablist');
  tabs.forEach((tab, i) => {
    const panel = panelEls[i]!;
    if (!tab.id) tab.id = `${panel.id}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      select(tabs, panelEls, i, false);
    });
  });

  list.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    let next = current;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      case ' ':
        // role="tab" on a link: Space selects, like Enter.
        event.preventDefault();
        select(tabs, panelEls, current, false);
        return;
      default:
        return;
    }
    event.preventDefault();
    select(tabs, panelEls, next, true);
  });

  // Start on the panel the URL points at, if any (same as the CSS fallback).
  const fromHash = panelEls.findIndex((p) => `#${p.id}` === window.location.hash);
  root.classList.add('tabs-ready');
  select(tabs, panelEls, Math.max(0, fromHash), false);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-tabs]')) setup(root);

export {};
