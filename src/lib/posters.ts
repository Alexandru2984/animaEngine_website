import { getImage } from 'astro:assets';
import type { Clip } from '../data/media';

/**
 * The poster frame shown before a clip plays. One function, so a page can
 * preload exactly the file ClipPlayer will request (same transform, same URL).
 */
export async function clipPoster(clip: Clip) {
  return getImage({ src: clip.poster, width: 1280, format: 'webp', quality: 78 });
}
