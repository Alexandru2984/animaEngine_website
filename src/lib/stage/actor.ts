/**
 * Behaviour of one character on a stage: a small state machine with simple
 * physics. Pure: no DOM, no clock, no Math.random — the caller passes the
 * time step and a random source, so it can be tested.
 *
 * Walkers stand on the ground line and wander, hop now and then, and answer
 * a click. Floaters drift through the sky region around the text. Both doze
 * when the visitor has been away, like the app's characters do.
 */

export type Kind = 'walker' | 'floater';
export type Mode = 'falling' | 'landing' | 'idle' | 'walking' | 'hop' | 'drifting' | 'sleeping';
/** Which sprite sheet the renderer should show. */
export type Sheet = 'idle' | 'walk' | 'fall' | 'sleep';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageContext {
  width: number;
  height: number;
  /** y (px from the stage top) of the ground at x (px). */
  groundAt: (x: number) => number;
  /** Where floaters may go (px). */
  sky: Rect;
  /** Regions characters must not cover: text, buttons. */
  avoid: Rect[];
}

export interface Actor {
  kind: Kind;
  /** Rendered size (px, square). */
  size: number;
  /** Centre x (px). */
  x: number;
  /** Walkers: height of the feet above the ground. Floaters: centre y. */
  y: number;
  vy: number;
  mode: Mode;
  /** Seconds left in the current mode (idle, landing, sleeping…). */
  timer: number;
  targetX: number;
  targetY: number;
  speed: number;
  /** -1 = moving left, 1 = moving right. */
  facing: -1 | 1;
  /** Time the current sheet has been playing, for frame selection. */
  clock: number;
  /** Phase for a floater's bob. */
  bob: number;
}

export type Random = () => number;

export const GRAVITY = 2200; // px/s²
export const HOP_SPEED = 520; // px/s, straight up
export const LANDING_TIME = 0.16; // s of squash after a landing
export const FRAMES = 12; // every built-in sheet has 12 frames

const FPS: Record<Sheet, number> = { idle: 8, walk: 10, fall: 12, sleep: 1 };

const between = (rnd: Random, a: number, b: number) => a + (b - a) * rnd();

export function createActor(kind: Kind, size: number, x: number, y: number, rnd: Random): Actor {
  return {
    kind,
    size,
    x,
    y,
    vy: 0,
    mode: kind === 'walker' ? 'idle' : 'drifting',
    timer: between(rnd, 0.5, 2.5),
    targetX: x,
    targetY: y,
    speed: kind === 'walker' ? between(rnd, 34, 58) : between(rnd, 14, 24),
    facing: rnd() < 0.5 ? -1 : 1,
    clock: rnd() * 2,
    bob: rnd() * Math.PI * 2,
  };
}

/** Start a walker high above its landing spot, falling (the entrance). */
export function dropIn(actor: Actor, height: number): Actor {
  return { ...actor, y: height, vy: 0, mode: 'falling', clock: 0 };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** The box a character occupies (px), for avoidance checks. */
export function boundsOf(actor: Actor, ctx: StageContext): Rect {
  const half = actor.size / 2;
  if (actor.kind === 'floater') return { x: actor.x - half, y: actor.y - half, w: actor.size, h: actor.size };
  const feet = ctx.groundAt(actor.x) - actor.y;
  return { x: actor.x - half, y: feet - actor.size, w: actor.size, h: actor.size };
}

/** A walking target at least `minDist` away, inside the margins, clear of avoid regions. */
export function pickWalkTarget(actor: Actor, ctx: StageContext, rnd: Random, minDist = 80): number {
  const margin = actor.size * 0.6;
  const lo = margin;
  const hi = Math.max(lo, ctx.width - margin);
  for (let i = 0; i < 12; i++) {
    const x = between(rnd, lo, hi);
    if (Math.abs(x - actor.x) < minDist) continue;
    const probe: Actor = { ...actor, x, y: 0 };
    if (!ctx.avoid.some((r) => intersects(boundsOf(probe, ctx), r))) return x;
  }
  return Math.min(hi, Math.max(lo, actor.x));
}

/** A drifting target inside the sky region, clear of avoid regions. */
export function pickFloatTarget(actor: Actor, ctx: StageContext, rnd: Random): { x: number; y: number } {
  const half = actor.size / 2;
  const { sky } = ctx;
  for (let i = 0; i < 16; i++) {
    const x = between(rnd, sky.x + half, sky.x + Math.max(half, sky.w - half));
    const y = between(rnd, sky.y + half, sky.y + Math.max(half, sky.h - half));
    const box = { x: x - half, y: y - half, w: actor.size, h: actor.size };
    if (!ctx.avoid.some((r) => intersects(box, r))) return { x, y };
  }
  return { x: actor.x, y: actor.y };
}

/** What a walker does when its current mode runs out. */
export function decide(actor: Actor, ctx: StageContext, rnd: Random): Actor {
  if (actor.kind === 'floater') {
    const t = pickFloatTarget(actor, ctx, rnd);
    return { ...actor, mode: 'drifting', targetX: t.x, targetY: t.y, timer: between(rnd, 6, 12) };
  }
  const roll = rnd();
  if (roll < 0.6) {
    const targetX = pickWalkTarget(actor, ctx, rnd);
    return { ...actor, mode: 'walking', targetX, facing: targetX < actor.x ? -1 : 1, clock: 0 };
  }
  if (roll < 0.72) return hop(actor);
  return { ...actor, mode: 'idle', timer: between(rnd, 1.5, 4.5), clock: 0 };
}

/** A small jump: for fun, on a click, or when waking up. */
export function hop(actor: Actor, strength = 1): Actor {
  if (actor.kind === 'floater') return { ...actor, vy: -90 * strength };
  return { ...actor, mode: 'hop', vy: HOP_SPEED * strength, clock: 0 };
}

export function sleep(actor: Actor): Actor {
  return { ...actor, mode: 'sleeping', vy: 0, y: actor.kind === 'walker' ? 0 : actor.y };
}

export function wake(actor: Actor, rnd: Random): Actor {
  return hop({ ...actor, mode: actor.kind === 'walker' ? 'idle' : 'drifting', timer: between(rnd, 0.5, 1.5) }, 0.8);
}

/** Keep a character inside the stage after a resize. */
export function clampToStage(actor: Actor, ctx: StageContext): Actor {
  const half = actor.size / 2;
  const x = Math.min(ctx.width - half, Math.max(half, actor.x));
  if (actor.kind === 'walker') return { ...actor, x, targetX: Math.min(ctx.width - half, Math.max(half, actor.targetX)) };
  const { sky } = ctx;
  const y = Math.min(sky.y + sky.h - half, Math.max(sky.y + half, actor.y));
  return { ...actor, x, y };
}

/** Advance one character by `dt` seconds. */
export function step(actor: Actor, dt: number, ctx: StageContext, rnd: Random): Actor {
  let a: Actor = { ...actor, clock: actor.clock + dt };

  if (a.kind === 'floater') {
    if (a.mode === 'sleeping') return a;
    a.bob += dt * 1.6;
    // A floater's vy is a short vertical nudge (a click), decaying quickly.
    if (a.vy !== 0) {
      a.y += a.vy * dt;
      a.vy *= Math.pow(0.02, dt);
      if (Math.abs(a.vy) < 4) a.vy = 0;
    }
    const dx = a.targetX - a.x;
    const dy = a.targetY - a.y;
    const dist = Math.hypot(dx, dy);
    a.timer -= dt;
    if (dist < 2 || a.timer <= 0) return decide(a, ctx, rnd);
    const move = Math.min(dist, a.speed * dt);
    a.x += (dx / dist) * move;
    a.y += (dy / dist) * move;
    if (Math.abs(dx) > 1) a.facing = dx < 0 ? -1 : 1;
    return a;
  }

  switch (a.mode) {
    case 'falling':
    case 'hop': {
      a.vy -= GRAVITY * dt;
      a.y += a.vy * dt;
      if (a.y <= 0) {
        a.y = 0;
        a.vy = 0;
        a.mode = 'landing';
        a.timer = LANDING_TIME;
        a.clock = 0;
      }
      return a;
    }
    case 'landing':
    case 'idle': {
      a.timer -= dt;
      if (a.timer <= 0) {
        if (a.mode === 'landing') return { ...a, mode: 'idle', timer: between(rnd, 0.8, 3), clock: 0 };
        return decide(a, ctx, rnd);
      }
      return a;
    }
    case 'walking': {
      const dx = a.targetX - a.x;
      if (Math.abs(dx) < 1.5) return { ...a, x: a.targetX, mode: 'idle', timer: between(rnd, 1.5, 4.5), clock: 0 };
      a.x += Math.sign(dx) * Math.min(Math.abs(dx), a.speed * dt);
      a.facing = dx < 0 ? -1 : 1;
      return a;
    }
    case 'sleeping':
    case 'drifting':
      return a;
  }
}

/** The sheet to show and its frame (0..11) for the current state. */
export function frameOf(actor: Actor): { sheet: Sheet; frame: number } {
  let sheet: Sheet;
  switch (actor.mode) {
    case 'falling':
      sheet = 'fall';
      break;
    case 'hop':
      sheet = actor.vy > 0 ? 'walk' : 'fall';
      break;
    case 'walking':
      sheet = 'walk';
      break;
    case 'sleeping':
      sheet = 'sleep';
      break;
    default:
      sheet = 'idle';
  }
  if (sheet === 'sleep') return { sheet, frame: 0 };
  return { sheet, frame: Math.floor(actor.clock * FPS[sheet]) % FRAMES };
}

/** Whether the character needs drawing every frame (sleeping ones do not). */
export function isAnimating(actor: Actor): boolean {
  return actor.mode !== 'sleeping';
}
