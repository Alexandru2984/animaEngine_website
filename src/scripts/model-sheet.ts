/**
 * The model sheet (ModelSheet.astro): pick a character and a state, see the
 * app's sprite sheet for it play, with the current frame marked on the strip.
 * Plays only while on screen; starts paused under prefers-reduced-motion.
 */

interface CharacterData {
  name: string;
  label: string;
  sheets: Record<'idle' | 'walk' | 'drag' | 'fall', string>;
  sleep: string;
}

const FRAMES = 12;
const FPS: Record<string, number> = { idle: 8, walk: 10, drag: 8, fall: 12 };
const WORDS: Record<string, string> = {
  idle: 'standing',
  walk: 'walking',
  drag: 'picked up',
  fall: 'falling',
  sleep: 'asleep',
};
const CAPTION: Record<string, string> = {
  idle: "The app's idle sheet: twelve frames, played in a loop.",
  walk: 'The walk sheet: twelve frames, played while it moves.',
  drag: 'The picked-up sheet: twelve frames of dangling.',
  fall: 'The fall sheet: twelve frames, played until it lands.',
  sleep: 'Asleep is a single drawing.',
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setup(root: HTMLElement) {
  const raw = root.querySelector('[data-model-data]')?.textContent;
  const detail = root.querySelector<HTMLElement>('[data-detail]');
  const lineup = root.querySelector<HTMLElement>('[data-lineup]');
  const preview = root.querySelector<HTMLElement>('[data-preview]');
  const strip = root.querySelector<HTMLImageElement>('[data-strip]');
  const stripWrap = root.querySelector<HTMLElement>('[data-strip-wrap]');
  const mark = root.querySelector<HTMLElement>('[data-frame-mark]');
  const title = root.querySelector<HTMLElement>('[data-study-title]');
  const caption = root.querySelector<HTMLElement>('[data-strip-caption]');
  const play = root.querySelector<HTMLButtonElement>('[data-play]');
  const playText = root.querySelector<HTMLElement>('[data-play-text]');
  if (!raw || !detail || !lineup || !preview || !strip || !stripWrap || !mark || !title || !caption || !play || !playText) return;

  let characters: CharacterData[];
  try {
    characters = (JSON.parse(raw) as { characters: CharacterData[] }).characters;
  } catch {
    return;
  }

  let current = characters.find((c) => c.name === 'cat') ?? characters[0]!;
  let state = 'idle';
  let paused = reducedMotion.matches;
  let visible = false;
  let raf = 0;
  let start = 0;
  let shownFrame = -1;

  const picks = [...root.querySelectorAll<HTMLElement>('[data-pick]')];
  const stateButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-state]')];

  const showFrame = (frame: number) => {
    if (frame === shownFrame) return;
    shownFrame = frame;
    preview.style.backgroundPositionX = `${(frame * 100) / (FRAMES - 1)}%`;
    mark.style.transform = `translateX(${frame * 100}%)`;
  };

  const tick = (now: number) => {
    const frame = Math.floor(((now - start) / 1000) * (FPS[state] ?? 8)) % FRAMES;
    showFrame(frame);
    raf = requestAnimationFrame(tick);
  };

  const refreshLoop = () => {
    cancelAnimationFrame(raf);
    if (!paused && visible && state !== 'sleep' && document.visibilityState === 'visible') {
      start = performance.now();
      raf = requestAnimationFrame(tick);
    }
    const playing = !paused && state !== 'sleep';
    playText.textContent = playing ? 'Pause' : 'Play';
    const icon = play.querySelector('svg');
    if (icon) icon.innerHTML = playing ? '<path d="M8 5v14"/><path d="M16 5v14"/>' : '<path d="M8 5.5v13l10.5-6.5z"/>';
    play.hidden = state === 'sleep';
  };

  const render = () => {
    const sleeping = state === 'sleep';
    const url = sleeping ? current.sleep : current.sheets[state as keyof CharacterData['sheets']];
    preview.style.backgroundImage = `url("${url}")`;
    preview.classList.toggle('still', sleeping);
    stripWrap.hidden = sleeping;
    if (!sleeping && strip.getAttribute('src') !== url) strip.src = url;
    shownFrame = -1;
    showFrame(0);
    title.textContent = `${current.label}, ${WORDS[state] ?? state}`;
    caption.textContent = CAPTION[state] ?? '';
    for (const p of picks) p.setAttribute('aria-pressed', String(p.dataset.pick === current.name));
    for (const b of stateButtons) b.setAttribute('aria-pressed', String(b.dataset.state === state));
    refreshLoop();
  };

  // Upgrade the line-up into buttons.
  for (const p of picks) {
    p.setAttribute('role', 'button');
    p.tabIndex = 0;
    const choose = () => {
      current = characters.find((c) => c.name === p.dataset.pick) ?? current;
      render();
    };
    p.addEventListener('click', choose);
    p.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose();
      }
    });
  }
  for (const b of stateButtons) {
    b.addEventListener('click', () => {
      state = b.dataset.state ?? 'idle';
      render();
    });
  }
  play.addEventListener('click', () => {
    paused = !paused;
    refreshLoop();
  });

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    refreshLoop();
  }).observe(detail);
  document.addEventListener('visibilitychange', refreshLoop);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) paused = true;
    refreshLoop();
  });

  lineup.classList.add('ready');
  detail.hidden = false;
  render();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-model-sheet]')) setup(root);

export {};
