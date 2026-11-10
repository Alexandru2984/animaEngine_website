/**
 * The character explorer (CharacterExplorer.astro). Animated WebPs are only
 * fetched when chosen. With prefers-reduced-motion the stage starts paused
 * and shows a still drawing until the visitor presses Play.
 */

interface CharacterData {
  name: string;
  label: string;
  still: string;
  states: Record<string, string>;
}

interface ExplorerData {
  characters: CharacterData[];
  states: { id: string; label: string }[];
}

const STATE_WORDS: Record<string, string> = {
  idle: 'idle',
  walk: 'walking',
  drag: 'dangling, picked up',
  fall: 'falling',
  sleep: 'asleep',
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setup(root: HTMLElement) {
  const raw = root.querySelector('[data-character-data]')?.textContent;
  const ui = root.querySelector<HTMLElement>('[data-explorer-ui]');
  const staticList = root.querySelector<HTMLElement>('[data-roster-static]');
  const img = root.querySelector<HTMLImageElement>('[data-stage-img]');
  const caption = root.querySelector<HTMLElement>('[data-stage-caption]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-stage-toggle]');
  const toggleText = root.querySelector<HTMLElement>('[data-stage-toggle-text]');
  if (!raw || !ui || !img || !caption || !toggle || !toggleText) return;

  let data: ExplorerData;
  try {
    data = JSON.parse(raw) as ExplorerData;
  } catch {
    return;
  }

  let paused = reducedMotion.matches;

  const selected = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;

  const render = () => {
    const character = data.characters.find((c) => c.name === selected('explorer-character')) ?? data.characters[0];
    const state = selected('explorer-state') ?? 'idle';
    if (!character) return;
    const animated = state !== 'sleep';
    // Paused: the standing drawing (or the sleeping one, which is a still).
    const src = paused && animated ? character.still : (character.states[state] ?? character.still);
    if (img.getAttribute('src') !== src) img.src = src;
    const word = STATE_WORDS[state] ?? state;
    img.alt = paused && animated ? `The ${character.name}, standing still` : `The ${character.name}, ${word}`;
    caption.textContent = `${character.label} · ${data.states.find((s) => s.id === state)?.label ?? state}`;

    toggle.hidden = !animated;
    toggleText.textContent = paused ? 'Play' : 'Pause';
    const icon = toggle.querySelector('svg');
    if (icon) icon.innerHTML = paused ? '<path d="M8 5.5v13l10.5-6.5z"/>' : '<path d="M8 5v14"/><path d="M16 5v14"/>';
  };

  root.addEventListener('change', (event) => {
    if ((event.target as HTMLElement).matches('input[type="radio"]')) render();
  });
  toggle.addEventListener('click', () => {
    paused = !paused;
    render();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) paused = true;
    render();
  });

  ui.hidden = false;
  if (staticList) staticList.hidden = true;
  render();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-character-explorer]')) setup(root);

export {};
