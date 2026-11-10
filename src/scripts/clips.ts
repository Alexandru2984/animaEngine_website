/**
 * Progressive enhancement for <figure data-clip> (ClipPlayer.astro):
 * - swaps the native controls for a single play/pause button;
 * - clips marked data-autoplay play while at least half visible, unless the
 *   visitor prefers reduced motion or paused the clip themselves;
 * - every clip pauses when scrolled out of view or when another clip in the
 *   same tab group becomes active (see tabs.ts, "tabs:change").
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

interface ClipState {
  video: HTMLVideoElement;
  toggle: HTMLButtonElement;
  autoplay: boolean;
  userPaused: boolean;
  visible: boolean;
}

const states = new Map<HTMLElement, ClipState>();

function render(state: ClipState) {
  state.toggle.dataset.state = state.video.paused ? 'paused' : 'playing';
}

function play(state: ClipState) {
  const attempt = state.video.play();
  // Autoplay can be refused (data saver, browser policy); stay on the poster.
  attempt?.catch(() => render(state));
}

function shouldAutoplay(state: ClipState): boolean {
  return state.autoplay && state.visible && !state.userPaused && !reducedMotion.matches && !isInHiddenPanel(state.video);
}

function isInHiddenPanel(el: HTMLElement): boolean {
  return el.closest('[data-tab-panel][hidden]') !== null;
}

function setup(root: HTMLElement) {
  if (states.has(root)) return;
  const video = root.querySelector('video');
  const toggle = root.querySelector<HTMLButtonElement>('[data-clip-toggle]');
  if (!video || !toggle) return;

  const state: ClipState = { video, toggle, autoplay: root.hasAttribute('data-autoplay'), userPaused: false, visible: false };
  states.set(root, state);

  video.removeAttribute('controls');
  toggle.hidden = false;
  render(state);

  video.addEventListener('play', () => render(state));
  video.addEventListener('pause', () => render(state));
  video.addEventListener('ended', () => render(state));

  const onToggle = () => {
    if (video.paused) {
      state.userPaused = false;
      play(state);
    } else {
      state.userPaused = true;
      video.pause();
    }
  };
  toggle.addEventListener('click', onToggle);
  // Clicking the picture itself also toggles, as a video player would.
  video.addEventListener('click', onToggle);
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const state = states.get(entry.target as HTMLElement);
      if (!state) continue;
      state.visible = entry.isIntersecting;
      if (shouldAutoplay(state)) play(state);
      else if (!entry.isIntersecting && !state.video.paused) state.video.pause();
    }
  },
  { threshold: 0.5 },
);

function init() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-clip]')) {
    setup(root);
    observer.observe(root);
  }
}

reducedMotion.addEventListener('change', () => {
  for (const state of states.values()) {
    if (reducedMotion.matches) {
      if (!state.video.paused && state.autoplay) state.video.pause();
    } else if (shouldAutoplay(state)) {
      play(state);
    }
  }
});

// A tab group switched panels: pause clips in hidden panels, and start the
// newly shown one when it is meant to autoplay.
document.addEventListener('tabs:change', (event) => {
  const panel = (event as CustomEvent<{ panel: HTMLElement }>).detail.panel;
  for (const [root, state] of states) {
    if (!panel.contains(root)) {
      if (!state.video.paused) state.video.pause();
    } else if (shouldAutoplay(state)) {
      play(state);
    }
  }
});

// Background tabs: stop decoding; resume autoplay clips on return.
document.addEventListener('visibilitychange', () => {
  for (const state of states.values()) {
    if (document.visibilityState === 'hidden') {
      if (!state.video.paused) state.video.pause();
    } else if (shouldAutoplay(state)) {
      play(state);
    }
  }
});

init();

export {};
