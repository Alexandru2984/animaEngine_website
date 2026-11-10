import { describe, expect, it } from 'vitest';
import { detectFromUserAgent, detectPlatform, mergeClientHints, UNKNOWN, type NavigatorLike } from '../src/lib/os-detect';

const UA = {
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  chromeOS:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ubuntuFirefox: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  fedoraFirefox: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
  linuxChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linuxArm: 'Mozilla/5.0 (X11; Linux aarch64; rv:133.0) Gecko/20100101 Firefox/133.0',
  curl: 'curl/8.5.0',
};

describe('detectFromUserAgent', () => {
  it('recognises Windows and does not trust the UA for its CPU', () => {
    expect(detectFromUserAgent(UA.windowsChrome)).toMatchObject({ os: 'windows', arch: 'unknown', source: 'user-agent' });
    expect(detectFromUserAgent(UA.windowsFirefox).os).toBe('windows');
  });

  it('recognises macOS, whose UA always claims Intel', () => {
    expect(detectFromUserAgent(UA.macSafari)).toMatchObject({ os: 'macos', arch: 'unknown' });
  });

  it('treats a "Macintosh" with a touch screen as an iPad', () => {
    expect(detectFromUserAgent(UA.macSafari, 5).os).toBe('ios');
  });

  it('does not mistake Android or ChromeOS for desktop Linux', () => {
    expect(detectFromUserAgent(UA.android).os).toBe('android');
    expect(detectFromUserAgent(UA.chromeOS).os).toBe('chromeos');
    expect(detectFromUserAgent(UA.iPhone).os).toBe('ios');
  });

  it('recognises Linux, its CPU and distribution hints', () => {
    expect(detectFromUserAgent(UA.linuxChrome)).toEqual({ os: 'linux', arch: 'x86_64', linuxFamily: 'unknown', source: 'user-agent' });
    expect(detectFromUserAgent(UA.ubuntuFirefox)).toMatchObject({ os: 'linux', linuxFamily: 'debian' });
    expect(detectFromUserAgent(UA.fedoraFirefox)).toMatchObject({ os: 'linux', linuxFamily: 'fedora' });
    expect(detectFromUserAgent(UA.linuxArm)).toMatchObject({ os: 'linux', arch: 'arm64' });
  });

  it('returns unknown for empty or unrecognised agents', () => {
    expect(detectFromUserAgent(undefined)).toEqual(UNKNOWN);
    expect(detectFromUserAgent('')).toEqual(UNKNOWN);
    expect(detectFromUserAgent(UA.curl)).toEqual(UNKNOWN);
  });
});

describe('mergeClientHints', () => {
  it('prefers the platform hint over the UA string', () => {
    const base = detectFromUserAgent(UA.linuxChrome);
    expect(mergeClientHints(base, { platform: 'Windows' })).toMatchObject({ os: 'windows', source: 'client-hints' });
    expect(mergeClientHints(base, { platform: 'Chrome OS' }).os).toBe('chromeos');
  });

  it('reads the architecture hints', () => {
    const base = detectFromUserAgent(UA.windowsChrome);
    expect(mergeClientHints(base, { platform: 'Windows', architecture: 'arm', bitness: '64' }).arch).toBe('arm64');
    expect(mergeClientHints(base, { platform: 'Windows', architecture: 'x86', bitness: '64' }).arch).toBe('x86_64');
    expect(mergeClientHints(base, { platform: 'Windows', architecture: 'x86', bitness: '32' }).arch).toBe('unknown');
  });

  it('marks mobile Linux as Android', () => {
    expect(mergeClientHints(detectFromUserAgent(UA.linuxChrome), { platform: '', mobile: true }).os).toBe('android');
  });

  it('keeps the base detection when hints say nothing useful', () => {
    const base = detectFromUserAgent(UA.ubuntuFirefox);
    expect(mergeClientHints(base, undefined)).toBe(base);
    expect(mergeClientHints(base, { platform: '' })).toEqual(base);
  });
});

describe('detectPlatform', () => {
  it('works with only a user agent', async () => {
    await expect(detectPlatform({ userAgent: UA.linuxChrome })).resolves.toMatchObject({ os: 'linux' });
    await expect(detectPlatform(undefined)).resolves.toEqual(UNKNOWN);
  });

  it('uses high-entropy hints when the browser provides them', async () => {
    const nav: NavigatorLike = {
      userAgent: UA.windowsChrome,
      userAgentData: {
        platform: 'Windows',
        mobile: false,
        getHighEntropyValues: async () => ({ architecture: 'arm', bitness: '64' }),
      },
    };
    await expect(detectPlatform(nav)).resolves.toMatchObject({ os: 'windows', arch: 'arm64', source: 'client-hints' });
  });

  it('survives hints that reject or never answer', async () => {
    const rejecting: NavigatorLike = {
      userAgent: UA.linuxChrome,
      userAgentData: { platform: 'Linux', getHighEntropyValues: () => Promise.reject(new Error('denied')) },
    };
    await expect(detectPlatform(rejecting)).resolves.toMatchObject({ os: 'linux', arch: 'x86_64' });

    const hanging: NavigatorLike = {
      userAgent: UA.linuxChrome,
      userAgentData: { platform: 'Linux', getHighEntropyValues: () => new Promise(() => {}) },
    };
    await expect(detectPlatform(hanging, 20)).resolves.toMatchObject({ os: 'linux' });
  });
});
