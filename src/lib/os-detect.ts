/**
 * Best-effort detection of the visitor's operating system and CPU
 * architecture. Browsers can hide or fake all of this, so the result only
 * chooses which download to suggest first; every option stays available.
 */

export type DetectedOS = 'linux' | 'windows' | 'macos' | 'chromeos' | 'android' | 'ios' | 'unknown';
export type DetectedArch = 'x86_64' | 'arm64' | 'arm' | 'unknown';
/** Hint from distribution-packaged browsers (e.g. Ubuntu's Firefox). */
export type LinuxFamily = 'debian' | 'fedora' | 'unknown';

export interface Detection {
  os: DetectedOS;
  arch: DetectedArch;
  linuxFamily: LinuxFamily;
  /** Where the OS answer came from. */
  source: 'client-hints' | 'user-agent' | 'none';
}

/** The parts of `navigator.userAgentData` we use (User-Agent Client Hints). */
export interface ClientHints {
  platform?: string;
  mobile?: boolean;
  architecture?: string;
  bitness?: string;
}

export interface NavigatorLike {
  userAgent?: string;
  maxTouchPoints?: number;
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
    getHighEntropyValues?: (hints: string[]) => Promise<Partial<ClientHints>>;
  };
}

export const UNKNOWN: Detection = Object.freeze({
  os: 'unknown',
  arch: 'unknown',
  linuxFamily: 'unknown',
  source: 'none',
});

/** Whether the OS is one animaEngine could in principle run on as a desktop app. */
export function isDesktop(os: DetectedOS): os is 'linux' | 'windows' | 'macos' {
  return os === 'linux' || os === 'windows' || os === 'macos';
}

function archFromUserAgent(ua: string): DetectedArch {
  if (/\b(aarch64|arm64)\b/i.test(ua)) return 'arm64';
  if (/\b(armv\d+l?|armhf)\b/i.test(ua)) return 'arm';
  if (/\b(x86_64|x86-64|amd64|x64|win64|wow64)\b/i.test(ua)) return 'x86_64';
  return 'unknown';
}

function linuxFamilyFromUserAgent(ua: string): LinuxFamily {
  if (/\b(ubuntu|debian|linux mint|pop!_os|elementary|kubuntu|xubuntu)\b/i.test(ua)) return 'debian';
  if (/\b(fedora|red hat|centos|rocky|almalinux|opensuse|suse)\b/i.test(ua)) return 'fedora';
  return 'unknown';
}

/**
 * Detects the platform from a User-Agent string. Order matters: Android and
 * ChromeOS user agents also contain "Linux", and iPadOS reports "Macintosh".
 */
export function detectFromUserAgent(userAgent: string | undefined, maxTouchPoints = 0): Detection {
  const ua = (userAgent ?? '').trim();
  if (ua === '') return UNKNOWN;

  let os: DetectedOS = 'unknown';
  if (/\b(iphone|ipad|ipod)\b/i.test(ua)) os = 'ios';
  else if (/\bandroid\b/i.test(ua)) os = 'android';
  else if (/\bCrOS\b/.test(ua)) os = 'chromeos';
  else if (/\bwindows\b|\bwin(32|64)\b/i.test(ua)) os = 'windows';
  else if (/\bmac os x\b|\bmacintosh\b/i.test(ua)) os = maxTouchPoints > 1 ? 'ios' : 'macos';
  else if (/\blinux\b|\bx11\b/i.test(ua)) os = 'linux';

  if (os === 'unknown') return UNKNOWN;

  let arch = archFromUserAgent(ua);
  // Windows browsers on ARM often still say "Win64; x64", and every macOS
  // browser says "Intel", so the UA cannot tell us the CPU there.
  if (os === 'windows' || os === 'macos') arch = 'unknown';
  if (os === 'ios' || os === 'android') arch = 'unknown';

  return {
    os,
    arch,
    linuxFamily: os === 'linux' ? linuxFamilyFromUserAgent(ua) : 'unknown',
    source: 'user-agent',
  };
}

function osFromPlatformHint(platform: string | undefined): DetectedOS | null {
  switch ((platform ?? '').trim().toLowerCase()) {
    case 'windows':
      return 'windows';
    case 'macos':
      return 'macos';
    case 'linux':
      return 'linux';
    case 'chrome os':
    case 'chromeos':
    case 'chromium os':
      return 'chromeos';
    case 'android':
      return 'android';
    case 'ios':
      return 'ios';
    default:
      return null;
  }
}

/**
 * Refines a User-Agent based detection with User-Agent Client Hints, which
 * Chromium-based browsers provide. Hints win where they are present, because
 * the UA string is frozen in those browsers.
 */
export function mergeClientHints(base: Detection, hints: ClientHints | undefined): Detection {
  if (!hints) return base;
  const fromHint = osFromPlatformHint(hints.platform);
  let os = fromHint ?? base.os;
  if (hints.mobile === true && (os === 'linux' || os === 'unknown')) os = 'android';

  let arch = base.arch;
  const hintArch = (hints.architecture ?? '').toLowerCase();
  if (hintArch === 'arm') arch = hints.bitness === '32' ? 'arm' : 'arm64';
  else if (hintArch === 'x86') arch = hints.bitness === '32' ? 'unknown' : 'x86_64';

  return {
    os,
    arch: isDesktop(os) ? arch : 'unknown',
    linuxFamily: os === 'linux' ? base.linuxFamily : 'unknown',
    source: fromHint ? 'client-hints' : base.source,
  };
}

/**
 * Full detection for the browser: User-Agent first, then the low-entropy
 * client hints, then (when the browser offers them) the architecture hints.
 * Never throws and never waits longer than `timeoutMs`.
 */
export async function detectPlatform(nav: NavigatorLike | undefined, timeoutMs = 800): Promise<Detection> {
  if (!nav) return UNKNOWN;
  let detection = detectFromUserAgent(nav.userAgent, nav.maxTouchPoints ?? 0);
  const uaData = nav.userAgentData;
  if (!uaData) return detection;

  detection = mergeClientHints(detection, { platform: uaData.platform, mobile: uaData.mobile });
  if (typeof uaData.getHighEntropyValues !== 'function' || !isDesktop(detection.os)) return detection;

  try {
    const high = await Promise.race([
      uaData.getHighEntropyValues(['architecture', 'bitness']),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs)),
    ]);
    if (high) detection = mergeClientHints(detection, { platform: uaData.platform, ...high });
  } catch {
    // Permission policy or privacy settings may refuse high-entropy hints.
  }
  return detection;
}

export const OS_NAMES: Record<DetectedOS, string> = {
  linux: 'Linux',
  windows: 'Windows',
  macos: 'macOS',
  chromeos: 'ChromeOS',
  android: 'Android',
  ios: 'iOS / iPadOS',
  unknown: 'your system',
};

export const ARCH_NAMES: Record<DetectedArch, string> = {
  x86_64: 'x86_64',
  arm64: 'ARM64',
  arm: '32-bit ARM',
  unknown: 'unknown CPU',
};
