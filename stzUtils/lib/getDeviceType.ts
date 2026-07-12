/**
 * The real device type behind the User-Agent. iPadOS Safari spoofs a Mac UA by default, so UA
 * parsing alone can't tell an iPad from a Mac. When the UA claims Macintosh we triangulate three
 * independent iOS-only tells — touch hardware, the iOS motion-permission API, and the standalone
 * web-app flag — any of which betrays an iPad. Three signals (not just maxTouchPoints) survive a
 * hypothetical touchscreen Mac, which would report touch but none of the iOS APIs.
 *
 * A heuristic by necessity: Apple makes the iPad deliberately indistinguishable from a Mac, and
 * Safari ships no Client Hints, so for that one device there is no solid signal to read.
 */
export function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'unknown'; // SSR / node — no device to name

  const ua = navigator.userAgent;

  // Honest UAs: standard parsing is enough.
  if (!ua.includes('Macintosh')) {
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return ua.includes('Mobile') ? 'Android phone' : 'Android tablet';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';
    return 'unknown';
  }

  // Claims Macintosh: a real Mac, or an iPad in desktop mode. `standalone` and `requestPermission`
  // are iOS-only and absent from lib.dom.d.ts — cast to read them without a tsc error.
  const nav = navigator as Navigator & { standalone?: boolean };
  const orientation =
    typeof DeviceOrientationEvent !== 'undefined'
      ? (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      : undefined;

  const hasTouch = (nav.maxTouchPoints ?? 0) > 1;
  const hasIosMotionApi = typeof orientation?.requestPermission === 'function';
  const hasStandaloneFlag = typeof nav.standalone !== 'undefined';

  return hasTouch || hasIosMotionApi || hasStandaloneFlag ? 'iPad' : 'Mac';
}
