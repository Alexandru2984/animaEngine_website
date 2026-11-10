/** Formatting helpers shared by pages and client scripts. */

/** 11987448 -> "11.4 MB" (binary units, labelled the way file managers do). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** "2026-11-10T17:49:35Z" -> "10 November 2026", in UTC so builds are stable. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** ISO date without time, for <time datetime>. */
export function isoDay(iso: string): string {
  return iso.slice(0, 10);
}
