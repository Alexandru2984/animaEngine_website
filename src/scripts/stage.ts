/**
 * Runs the character stages ([data-stage], rendered by Stage.astro).
 *
 * - Characters are DOM sprites: a box whose background is the app's own
 *   sprite sheet, moved with transforms. Pointer events reach them only
 *   where a character is; the rest of the page is untouched.
 * - One requestAnimationFrame loop per stage, running only while the stage is
 *   on screen, the tab is visible, and something is awake. Sprite frames
 *   change at the sheet's own pace; nothing is written when nothing changed.
 * - Reduced motion: the characters stand still, and a click shows the bubble
 *   without the hop.
 * - Away for a while: everyone dozes (the loop stops); any input wakes them.
 */
import {
  boundsOf,
  clampToStage,
  createActor,
  dropIn,
  frameOf,
  hop,
  isAnimating,
  pickFloatTarget,
  pickWalkTarget,
  sleep,
  step,
  wake,
  FRAMES,
  type Actor,
  type Kind,
  type Rect,
  type Sheet,
  type StageContext,
} from '../lib/stage/actor';
import { FAR_HILL, LEDGE_HILL, NEAR_HILL, hillY, type HillSpec } from '../lib/stage/hills';

interface ActorData {
  name: string;
  label: string;
  kind: Kind;
  wideOnly: boolean;
  sheets: Record<'idle' | 'walk' | 'fall', string>;
  sleep: string;
  lines: string[];
}

interface StageConfig {
  actors: ActorData[];
  ground: 'near' | 'ledge' | 'far';
  entrance: 'fall' | 'none';
  /** px; walkers and floaters on wide and narrow screens. */
  size: { wide: number; narrow: number };
  dozeAfter: number;
}

const HILLS: Record<StageConfig['ground'], HillSpec> = { near: NEAR_HILL, ledge: LEDGE_HILL, far: FAR_HILL };
const NARROW = 720;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const random = Math.random;

interface Cast {
  data: ActorData;
  actor: Actor;
  el: HTMLElement;
  sprite: HTMLElement;
  bubble: HTMLElement;
  shown: { sheet: Sheet | ''; frame: number; x: number; y: number; flip: number; squash: number };
  bubbleTimer: number;
}

function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

class Stage {
  private cast: Cast[] = [];
  private ctx!: StageContext;
  private running = false;
  private visible = false;
  private asleep = false;
  private last = 0;
  private raf = 0;
  private dozeTimer = 0;
  private readonly hill: HillSpec;

  constructor(
    private readonly root: HTMLElement,
    private readonly layer: HTMLElement,
    private readonly config: StageConfig,
  ) {
    this.hill = HILLS[config.ground];
  }

  async start() {
    this.measure();
    const narrow = this.ctx.width < NARROW;
    const size = narrow ? this.config.size.narrow : this.config.size.wide;
    const chosen = this.config.actors.filter((a) => !(narrow && a.wideOnly));

    // The idle sheet is enough to appear; the rest arrive while they fall.
    await Promise.all(chosen.map((a) => preload(this.config.entrance === 'fall' && !reducedMotion.matches ? a.sheets.fall : a.sheets.idle)));

    const walkers = chosen.filter((a) => a.kind === 'walker');
    walkers.forEach((data, i) => {
      // Spread the walkers across the stage, clear of the text.
      const slot = (i + 0.5) / walkers.length;
      let actor = createActor('walker', size, slot * this.ctx.width, 0, random);
      actor = { ...actor, x: pickWalkTarget(actor, this.ctx, () => slot, 0) };
      if (this.config.entrance === 'fall' && !reducedMotion.matches) {
        actor = dropIn(actor, this.ctx.groundAt(actor.x) + size + 40 + i * 70);
      }
      this.add(data, actor);
    });
    chosen
      .filter((a) => a.kind === 'floater')
      .forEach((data) => {
        let actor = createActor('floater', Math.round(size * 0.86), 0, 0, random);
        const spot = pickFloatTarget(actor, this.ctx, random);
        actor = { ...actor, x: spot.x, y: spot.y, targetX: spot.x, targetY: spot.y };
        this.add(data, actor);
      });

    for (const c of this.cast) this.render(c);
    this.root.classList.add('stage-ready');

    // The other sheets, in the background.
    for (const a of chosen) for (const url of [a.sheets.idle, a.sheets.walk, a.sheets.fall, a.sleep]) void preload(url);

    new ResizeObserver(() => {
      this.measure();
      this.cast = this.cast.map((c) => ({ ...c, actor: clampToStage(c.actor, this.ctx) }));
      for (const c of this.cast) this.render(c);
    }).observe(this.root);

    new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.update();
      },
      { rootMargin: '80px' },
    ).observe(this.root);

    document.addEventListener('visibilitychange', () => this.update());
    reducedMotion.addEventListener('change', () => this.update());
    for (const type of ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const) {
      window.addEventListener(type, () => this.activity(), { passive: true });
    }
    this.activity();
  }

  private add(data: ActorData, actor: Actor) {
    const el = document.createElement('div');
    el.className = `actor actor-${actor.kind}`;
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--size', `${actor.size}px`);
    const sprite = document.createElement('div');
    sprite.className = 'sprite';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    el.append(bubble, sprite);
    el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.poke(cast);
    });
    this.layer.append(el);
    const cast: Cast = {
      data,
      actor,
      el,
      sprite,
      bubble,
      shown: { sheet: '', frame: -1, x: NaN, y: NaN, flip: 0, squash: -1 },
      bubbleTimer: 0,
    };
    this.cast.push(cast);
  }

  private measure() {
    const box = this.root.getBoundingClientRect();
    const hillEl = this.root.querySelector<SVGElement>('[data-stage-ground]');
    const hillBox = hillEl?.getBoundingClientRect() ?? { top: box.bottom - 120, height: 120 };
    const top = hillBox.top - box.top;
    const height = hillBox.height;
    const width = box.width;
    const hill = this.hill;
    // Feet sit slightly into the grass; the sheets carry their own shadow.
    const groundAt = (x: number) => top + hillY(hill, Math.min(1, Math.max(0, x / width))) * height + 6;

    const avoid: Rect[] = [...this.root.querySelectorAll<HTMLElement>('[data-stage-avoid]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left - 12, y: r.top - box.top - 12, w: r.width + 24, h: r.height + 24 };
    });
    const skyTop = Number(this.root.dataset.skyTop ?? 80);
    let highest = Infinity;
    for (let x = 0; x <= 1; x += 0.05) highest = Math.min(highest, groundAt(x * width));
    this.ctx = {
      width,
      height: box.height,
      groundAt,
      sky: { x: 0, y: skyTop, w: width, h: Math.max(60, highest - skyTop - 90) },
      avoid,
    };
  }

  private poke(c: Cast) {
    const line = c.data.lines[Math.floor(random() * c.data.lines.length)] ?? 'Hi!';
    c.bubble.textContent = c.actor.mode === 'sleeping' ? 'Zzz…' : line;
    c.el.classList.add('talking');
    window.clearTimeout(c.bubbleTimer);
    c.bubbleTimer = window.setTimeout(() => c.el.classList.remove('talking'), 1700);
    if (!reducedMotion.matches) {
      if (c.actor.mode === 'sleeping') c.actor = wake(c.actor, random);
      else if (c.actor.mode !== 'falling' && c.actor.mode !== 'hop') c.actor = hop(c.actor);
      this.update();
    }
    this.activity();
  }

  private activity() {
    window.clearTimeout(this.dozeTimer);
    if (this.asleep) {
      this.asleep = false;
      this.cast = this.cast.map((c) => {
        c.el.classList.remove('talking');
        return { ...c, actor: reducedMotion.matches ? { ...c.actor, mode: c.actor.kind === 'walker' ? 'idle' : 'drifting' } : wake(c.actor, random) };
      });
      for (const c of this.cast) this.render(c);
      this.update();
    }
    this.dozeTimer = window.setTimeout(() => this.doze(), this.config.dozeAfter * 1000);
  }

  private doze() {
    this.asleep = true;
    this.cast = this.cast.map((c, i) => {
      if (i % 2 === 0) {
        c.bubble.textContent = 'Zzz…';
        c.el.classList.add('talking');
      }
      return { ...c, actor: sleep(c.actor) };
    });
    for (const c of this.cast) this.render(c);
    this.update();
  }

  private update() {
    const shouldRun =
      this.visible && document.visibilityState === 'visible' && !reducedMotion.matches && this.cast.some((c) => isAnimating(c.actor));
    if (shouldRun && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  private tick(now: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    for (const c of this.cast) {
      c.actor = step(c.actor, dt, this.ctx, random);
      this.render(c);
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private render(c: Cast) {
    const a = c.actor;
    const { sheet, frame } = reducedMotion.matches ? { sheet: a.mode === 'sleeping' ? ('sleep' as const) : ('idle' as const), frame: 0 } : frameOf(a);
    let x: number;
    let y: number;
    if (a.kind === 'walker') {
      const box = boundsOf(a, this.ctx);
      x = box.x;
      y = box.y;
    } else {
      const bob = a.mode === 'sleeping' || reducedMotion.matches ? 0 : Math.sin(a.bob) * 5;
      x = a.x - a.size / 2;
      y = a.y - a.size / 2 + bob;
    }
    const flip = a.facing;
    const squash = a.mode === 'landing' ? 1 : 0;
    const s = c.shown;

    if (sheet !== s.sheet) {
      const url = sheet === 'sleep' ? c.data.sleep : c.data.sheets[sheet];
      c.sprite.style.backgroundImage = `url("${url}")`;
      c.sprite.classList.toggle('still', sheet === 'sleep');
      s.sheet = sheet;
      s.frame = -1;
    }
    if (frame !== s.frame) {
      c.sprite.style.backgroundPositionX = sheet === 'sleep' ? '0' : `${(frame * 100) / (FRAMES - 1)}%`;
      s.frame = frame;
    }
    const rx = Math.round(x * 2) / 2;
    const ry = Math.round(y * 2) / 2;
    if (rx !== s.x || ry !== s.y || flip !== s.flip || squash !== s.squash) {
      c.el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      c.sprite.style.transform = `scale(${flip * (squash ? 1.06 : 1)}, ${squash ? 0.92 : 1})`;
      s.x = rx;
      s.y = ry;
      s.flip = flip;
      s.squash = squash;
    }
  }
}

function init() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-stage]')) {
    const layer = root.querySelector<HTMLElement>('[data-stage-layer]');
    const raw = root.querySelector('[data-stage-config]')?.textContent;
    if (!layer || !raw) continue;
    let config: StageConfig;
    try {
      config = JSON.parse(raw) as StageConfig;
    } catch {
      continue;
    }
    const stage = new Stage(root, layer, config);
    const begin = () => void stage.start();
    // Characters are decoration: wait until the page itself has loaded.
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
  }
}

init();

export {};
