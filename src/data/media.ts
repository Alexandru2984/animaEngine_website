/**
 * Every picture and clip the site shows, imported from site-assets/ (which is
 * never modified) or from src/assets/derived/ (made by scripts/derive-assets.mjs).
 * Imports give hashed URLs under /_astro/, so they can be cached forever, and
 * only files referenced here end up in the build.
 *
 * Clips and screenshots were recorded from animaEngine on the project's test
 * rig (site-assets/README.md); characters are the app's built-in drawings.
 */
import type { ImageMetadata } from 'astro';

import desktopPoster from '../../site-assets/clips/desktop-poster.jpg';
import tapPoster from '../../site-assets/clips/tap-poster.jpg';
import pickupPoster from '../../site-assets/clips/pickup-poster.jpg';
import sleepPoster from '../../site-assets/clips/sleep-poster.jpg';
import desktopWebm from '../../site-assets/clips/desktop-720p.webm?url';
import tapWebm from '../../site-assets/clips/tap-720p.webm?url';
import pickupWebm from '../../site-assets/clips/pickup-720p.webm?url';
import sleepWebm from '../../site-assets/clips/sleep-720p.webm?url';
import desktopMp4 from '../assets/derived/clips/desktop-720p.mp4?url';
import tapMp4 from '../assets/derived/clips/tap-720p.mp4?url';
import pickupMp4 from '../assets/derived/clips/pickup-720p.mp4?url';
import sleepMp4 from '../assets/derived/clips/sleep-720p.mp4?url';

import welcomeShot from '../../site-assets/screenshots/welcome.png';
import desktopShot from '../../site-assets/screenshots/desktop.png';
import tapShot from '../../site-assets/screenshots/tap.png';
import pickupShot from '../../site-assets/screenshots/pickup.png';
import sleepShot from '../../site-assets/screenshots/sleep.png';

import iconSvg from '../../site-assets/icons/icon.svg?url';

export { iconSvg };

/** MIME types with codecs, so browsers skip a source they cannot decode. */
export const MP4_TYPE = 'video/mp4; codecs="avc1.640028"';
export const WEBM_TYPE = 'video/webm; codecs="vp9"';

export interface Clip {
  id: 'desktop' | 'tap' | 'pickup' | 'sleep';
  title: string;
  caption: string;
  /** Text alternative describing what happens in the clip. */
  description: string;
  poster: ImageMetadata;
  mp4: string;
  webm: string;
  width: number;
  height: number;
  seconds: number;
}

export const clips: Clip[] = [
  {
    id: 'desktop',
    title: 'On the desktop',
    caption: 'They walk and float over the desktop while clicks go through to your work.',
    description:
      'A dusk-coloured desktop: a heart, a ghost and a star float in the sky while a bunny, a slime, a frog and a cat walk along the hills at the bottom.',
    poster: desktopPoster,
    mp4: desktopMp4,
    webm: desktopWebm,
    width: 1280,
    height: 720,
    seconds: 8,
  },
  {
    id: 'tap',
    title: 'Tap a character',
    caption: 'Tap the cat or the heart, even outside edit mode, and each one answers.',
    description: 'On the desktop, the cat is tapped and hops with a speech bubble; then the heart is tapped and answers with a little heart.',
    poster: tapPoster,
    mp4: tapMp4,
    webm: tapWebm,
    width: 1280,
    height: 720,
    seconds: 11,
  },
  {
    id: 'pickup',
    title: 'Pick one up',
    caption: 'In edit mode, pick up the cat, hold it, and let it fall.',
    description:
      'Edit mode is open with the Inspector panel on the right. The cat is selected, lifted with the pointer, dangles while held and falls back to the ground when let go.',
    poster: pickupPoster,
    mp4: pickupMp4,
    webm: pickupWebm,
    width: 1280,
    height: 720,
    seconds: 12,
  },
  {
    id: 'sleep',
    title: 'Away and back',
    caption: 'A minute away and they doze off; come back and they wake.',
    description: 'While the computer is idle the characters close their eyes and doze with “Zzz…” bubbles, then wake up again.',
    poster: sleepPoster,
    mp4: sleepMp4,
    webm: sleepWebm,
    width: 1280,
    height: 720,
    seconds: 21,
  },
];

export interface Screenshot {
  id: string;
  image: ImageMetadata;
  alt: string;
  caption: string;
}

export const screenshots: Screenshot[] = [
  {
    id: 'welcome',
    image: welcomeShot,
    alt: 'The “Welcome to animaEngine” dialog with ten characters to choose from, a scene picker, a language menu and a “Start at login” option, over the desktop with the settings panel open on the right.',
    caption: 'The welcome: choose who lives on your desktop.',
  },
  {
    id: 'desktop',
    image: desktopShot,
    alt: 'Seven characters on a dusk desktop: a heart, a ghost and a star in the sky, and a bunny, a slime, a frog and a cat on the hills.',
    caption: 'Pass-through mode: only the characters, clicks go through.',
  },
  {
    id: 'pickup',
    image: pickupShot,
    alt: 'Edit mode with the cat selected inside a blue frame and the Inspector showing its position, scale, opacity, frame rate and easing.',
    caption: 'Edit mode: every property in the Inspector.',
  },
  {
    id: 'tap',
    image: tapShot,
    alt: 'Five characters on a dusk desktop; the cat, just tapped, says “Mrrp!” in a speech bubble.',
    caption: 'A tap outside edit mode gets an answer.',
  },
  {
    id: 'sleep',
    image: sleepShot,
    alt: 'The ghost, the heart, the star, the cat and the slime asleep on the desktop, eyes closed, each with a “Zzz…” bubble.',
    caption: 'Asleep while you are away.',
  },
];

export const CHARACTER_NAMES = [
  'ghost',
  'slime',
  'heart',
  'star',
  'cat',
  'bunny',
  'frog',
  'robot',
  'cloud',
  'mushroom',
] as const;
export type CharacterName = (typeof CHARACTER_NAMES)[number];

export const CHARACTER_STATES = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walking' },
  { id: 'drag', label: 'Picked up' },
  { id: 'fall', label: 'Falling' },
  { id: 'sleep', label: 'Asleep' },
] as const;
export type CharacterState = (typeof CHARACTER_STATES)[number]['id'];

// Only these file patterns are bundled; the sprite sheets and group pictures
// in site-assets/characters stay out of the build unless imported above.
const animated = import.meta.glob<string>('../../site-assets/characters/*-{idle,walk,drag,fall}.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const sleeping = import.meta.glob<{ default: ImageMetadata }>('../../site-assets/characters/*-sleep.png', {
  eager: true,
});
const stills = import.meta.glob<{ default: ImageMetadata }>(
  '../../site-assets/characters/{ghost,slime,heart,star,cat,bunny,frog,robot,cloud,mushroom}.png',
  { eager: true },
);

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing character asset: ${what}`);
  return value;
}

export interface Character {
  name: CharacterName;
  label: string;
  /** Standing still, for thumbnails and reduced motion (512×512 PNG). */
  still: ImageMetadata;
  /** Asleep (512×512 PNG, resized at build time). */
  asleep: ImageMetadata;
  /** URL of the 256×256 animated WebP for each moving state. */
  states: Record<Exclude<CharacterState, 'sleep'>, string>;
}

export const characters: Character[] = CHARACTER_NAMES.map((name) => {
  const base = '../../site-assets/characters/';
  return {
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    still: required(stills[`${base}${name}.png`], `${name}.png`).default,
    asleep: required(sleeping[`${base}${name}-sleep.png`], `${name}-sleep.png`).default,
    states: {
      idle: required(animated[`${base}${name}-idle.webp`], `${name}-idle.webp`),
      walk: required(animated[`${base}${name}-walk.webp`], `${name}-walk.webp`),
      drag: required(animated[`${base}${name}-drag.webp`], `${name}-drag.webp`),
      fall: required(animated[`${base}${name}-fall.webp`], `${name}-fall.webp`),
    },
  };
});

export function characterByName(name: CharacterName): Character {
  return required(
    characters.find((c) => c.name === name),
    name,
  );
}
