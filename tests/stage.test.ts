import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  clampToStage,
  createActor,
  decide,
  dropIn,
  frameOf,
  hop,
  isAnimating,
  pickFloatTarget,
  pickWalkTarget,
  sleep,
  step,
  wake,
  type Actor,
  type StageContext,
} from '../src/lib/stage/actor';
import { FAR_HILL, LEDGE_HILL, NEAR_HILL, hillPath, hillY } from '../src/lib/stage/hills';

/** Deterministic random numbers (LCG), so behaviour is repeatable. */
function seeded(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const ctx = (avoid: StageContext['avoid'] = []): StageContext => ({
  width: 1200,
  height: 800,
  groundAt: () => 700,
  sky: { x: 0, y: 40, w: 1200, h: 400 },
  avoid,
});

function run(actor: Actor, seconds: number, c = ctx(), rnd = seeded()): Actor[] {
  const states: Actor[] = [];
  let a = actor;
  for (let t = 0; t < seconds; t += 1 / 60) {
    a = step(a, 1 / 60, c, rnd);
    states.push(a);
  }
  return states;
}

describe('hills', () => {
  it('keeps every hill line inside its layer', () => {
    for (const spec of [FAR_HILL, NEAR_HILL, LEDGE_HILL]) {
      for (let x = 0; x <= 1; x += 0.01) {
        const y = hillY(spec, x);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('draws a closed path that matches the ground function', () => {
    const d = hillPath(NEAR_HILL, 1440, 240, 4);
    expect(d.startsWith('M0,240 L0.0,')).toBe(true);
    expect(d.endsWith('L1440,240 Z')).toBe(true);
    const firstY = Number(d.split(' ')[1]!.split(',')[1]);
    expect(firstY).toBeCloseTo(hillY(NEAR_HILL, 0) * 240, 0);
  });
});

describe('walkers', () => {
  it('fall in, land with a squash, then stand on the ground', () => {
    const rnd = seeded();
    const start = dropIn(createActor('walker', 88, 300, 0, rnd), 600);
    expect(start.mode).toBe('falling');
    const states = run(start, 2);
    expect(states.every((s) => s.y >= 0)).toBe(true);
    expect(states.some((s) => s.mode === 'landing')).toBe(true);
    const after = states.find((s, i) => i > 0 && states[i - 1]!.mode === 'landing' && s.mode !== 'landing');
    expect(after?.mode).toBe('idle');
    expect(after?.y).toBe(0);
  });

  it('walk to their target, face the way they go, then stop', () => {
    const rnd = seeded();
    const walker: Actor = { ...createActor('walker', 88, 200, 0, rnd), mode: 'walking', targetX: 500, speed: 50 };
    const states = run(walker, 10, ctx(), rnd);
    const arrived = states.find((s) => s.mode !== 'walking');
    expect(arrived).toBeDefined();
    expect(arrived!.x).toBeCloseTo(500, 0);
    expect(states[0]!.facing).toBe(1);
  });

  it('pick walking targets inside the margins and clear of text', () => {
    const rnd = seeded(3);
    const text = { x: 0, y: 600, w: 600, h: 200 };
    const c = ctx([text]);
    const walker = createActor('walker', 88, 900, 0, rnd);
    for (let i = 0; i < 50; i++) {
      const x = pickWalkTarget(walker, c, rnd);
      expect(x).toBeGreaterThanOrEqual(88 * 0.6);
      expect(x).toBeLessThanOrEqual(1200 - 88 * 0.6);
      const box = boundsOf({ ...walker, x, y: 0 }, c);
      expect(box.x >= text.x + text.w || box.x + box.w <= text.x).toBe(true);
    }
  });

  it('hop up and come back down', () => {
    const rnd = seeded();
    const up = hop({ ...createActor('walker', 88, 300, 0, rnd), mode: 'idle' });
    expect(up.mode).toBe('hop');
    expect(frameOf(up).sheet).toBe('walk');
    const states = run(up, 1.2, ctx(), rnd);
    expect(Math.max(...states.map((s) => s.y))).toBeGreaterThan(40);
    expect(states.some((s) => s.mode === 'hop' && frameOf(s).sheet === 'fall')).toBe(true);
    expect(states.at(-1)!.y).toBe(0);
  });

  it('choose among walking, hopping and idling', () => {
    const rnd = seeded(11);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(decide(createActor('walker', 88, 600, 0, rnd), ctx(), rnd).mode);
    expect(seen).toEqual(new Set(['walking', 'hop', 'idle']));
  });
});

describe('floaters', () => {
  it('drift inside the sky and clear of text', () => {
    const rnd = seeded(5);
    const text = { x: 0, y: 40, w: 640, h: 400 };
    const c = ctx([text]);
    const floater = createActor('floater', 76, 900, 200, rnd);
    for (let i = 0; i < 50; i++) {
      const t = pickFloatTarget(floater, c, rnd);
      expect(t.y - 38).toBeGreaterThanOrEqual(c.sky.y);
      expect(t.y + 38).toBeLessThanOrEqual(c.sky.y + c.sky.h);
      expect(t.x - 38 >= text.x + text.w).toBe(true);
    }
  });

  it('move towards their target', () => {
    const rnd = seeded();
    const floater: Actor = { ...createActor('floater', 76, 900, 200, rnd), targetX: 1000, targetY: 250, timer: 20 };
    const later = run(floater, 1, ctx(), rnd).at(-1)!;
    expect(Math.hypot(1000 - later.x, 250 - later.y)).toBeLessThan(Math.hypot(100, 50));
  });
});

describe('frames, sleep and resizing', () => {
  it('cycles through the twelve frames of the current sheet', () => {
    const base = createActor('walker', 88, 300, 0, seeded());
    const frames = new Set<number>();
    for (let t = 0; t < 2; t += 0.05) frames.add(frameOf({ ...base, mode: 'walking', clock: t }).frame);
    expect([...frames].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(frameOf({ ...base, mode: 'idle' }).sheet).toBe('idle');
    expect(frameOf({ ...base, mode: 'falling' }).sheet).toBe('fall');
  });

  it('sleeps still and wakes with a hop', () => {
    const rnd = seeded();
    const asleep = sleep({ ...createActor('walker', 88, 300, 0, rnd), mode: 'walking', y: 20 });
    expect(asleep).toMatchObject({ mode: 'sleeping', y: 0 });
    expect(isAnimating(asleep)).toBe(false);
    expect(frameOf(asleep)).toEqual({ sheet: 'sleep', frame: 0 });
    expect(step(asleep, 1, ctx(), rnd).x).toBe(300);
    const awake = wake(asleep, rnd);
    expect(awake.mode).toBe('hop');
    expect(awake.vy).toBeGreaterThan(0);
  });

  it('stays on stage after the window shrinks', () => {
    const rnd = seeded();
    const small = { ...ctx(), width: 400 };
    const walker = clampToStage({ ...createActor('walker', 88, 1100, 0, rnd), targetX: 1150 }, small);
    expect(walker.x).toBeLessThanOrEqual(400 - 44);
    expect(walker.targetX).toBeLessThanOrEqual(400 - 44);
    const floater = clampToStage({ ...createActor('floater', 76, 1100, 900, rnd) }, small);
    expect(floater.y).toBeLessThanOrEqual(small.sky.y + small.sky.h - 38);
  });
});
