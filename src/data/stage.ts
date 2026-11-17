/**
 * Sprite data for the character stages. The sheets are the app's own
 * (site-assets/characters/<name>-<state>-sheet.png: 12 frames of 256 px in a
 * row); the build re-encodes them as WebP with 160 px frames, which keeps
 * them sharp at the sizes the site draws them and about a quarter the size.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { characterByName, type CharacterName } from './media';
import type { Kind } from '../lib/stage/actor';

const sheets = import.meta.glob<{ default: ImageMetadata }>('../../site-assets/characters/*-{idle,walk,fall,drag}-sheet.png', {
  eager: true,
});

export const FRAME_PX = 160;
const SHEET_STATES = ['idle', 'walk', 'fall'] as const;
type SheetState = (typeof SHEET_STATES)[number] | 'drag';

/** What a character says when clicked. Short, like the app's own bubbles. */
const LINES: Partial<Record<CharacterName, string[]>> = {
  cat: ['Mrrp!', 'Mrrp?'],
  ghost: ['Boo!', 'Hi!'],
  heart: ['Hi!', 'Hello!'],
};
const DEFAULT_LINES = ['Hi!', 'Hello!'];

export interface CastMember {
  name: CharacterName;
  kind: Kind;
  /** Only shown on wide screens. */
  wideOnly?: boolean;
}

export interface StageActorData {
  name: CharacterName;
  label: string;
  kind: Kind;
  wideOnly: boolean;
  sheets: Record<(typeof SHEET_STATES)[number], string>;
  sleep: string;
  lines: string[];
}

export async function sheetUrl(name: CharacterName, state: SheetState): Promise<string> {
  const mod = sheets[`../../site-assets/characters/${name}-${state}-sheet.png`];
  if (!mod) throw new Error(`Missing sprite sheet: ${name}-${state}-sheet.png`);
  const img = await getImage({ src: mod.default, width: FRAME_PX * 12, format: 'webp', quality: 74 });
  return img.src;
}

export async function stageActors(cast: CastMember[]): Promise<StageActorData[]> {
  return Promise.all(
    cast.map(async (m) => {
      const character = characterByName(m.name);
      const [idle, walk, fall] = await Promise.all(SHEET_STATES.map((s) => sheetUrl(m.name, s)));
      const sleep = await getImage({ src: character.asleep, width: FRAME_PX, format: 'webp', quality: 80 });
      return {
        name: m.name,
        label: character.label,
        kind: m.kind,
        wideOnly: m.wideOnly ?? false,
        sheets: { idle: idle!, walk: walk!, fall: fall! },
        sleep: sleep.src,
        lines: LINES[m.name] ?? DEFAULT_LINES,
      };
    }),
  );
}
