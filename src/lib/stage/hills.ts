/**
 * The hills of the dusk desktop, as functions. The same function draws the
 * SVG at build time and tells the characters where the ground is at run
 * time, so feet and grass always agree.
 *
 * Coordinates are fractions: x in [0, 1] across the scene, y in [0, 1] down
 * the hill layer (0 = top of the layer, 1 = bottom).
 */

export interface Wave {
  /** Height of the wave as a fraction of the layer. */
  amp: number;
  /** Number of full waves across the scene. */
  freq: number;
  /** Phase, in turns (0..1). */
  phase: number;
}

export interface HillSpec {
  /** Where the hill line sits without waves (fraction of the layer). */
  base: number;
  waves: Wave[];
}

/** The far hill of animaEngine's default wallpaper: long and gentle. */
export const FAR_HILL: HillSpec = {
  base: 0.3,
  waves: [
    { amp: 0.14, freq: 0.9, phase: 0.62 },
    { amp: 0.05, freq: 2.3, phase: 0.1 },
  ],
};

/** The near hill, where the characters walk. */
export const NEAR_HILL: HillSpec = {
  base: 0.6,
  waves: [
    { amp: 0.1, freq: 1.15, phase: 0.05 },
    { amp: 0.035, freq: 2.7, phase: 0.4 },
  ],
};

/** A low, almost flat ridge for narrow strips (the download ledge). */
export const LEDGE_HILL: HillSpec = {
  base: 0.5,
  waves: [
    { amp: 0.14, freq: 0.8, phase: 0.3 },
    { amp: 0.05, freq: 2.1, phase: 0.7 },
  ],
};

/** y (fraction of the layer, 0 = top) of the hill line at x (0..1). */
export function hillY(spec: HillSpec, x: number): number {
  let y = spec.base;
  for (const w of spec.waves) y -= w.amp * Math.sin(2 * Math.PI * (x * w.freq + w.phase));
  return Math.min(1, Math.max(0, y));
}

/**
 * A closed SVG path for the hill, filled down to the bottom of a
 * `width` × `height` viewBox. Meant for preserveAspectRatio="none".
 */
export function hillPath(spec: HillSpec, width = 1440, height = 240, steps = 72): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    pts.push(`${(x * width).toFixed(1)},${(hillY(spec, x) * height).toFixed(1)}`);
  }
  return `M0,${height} L${pts.join(' L')} L${width},${height} Z`;
}
