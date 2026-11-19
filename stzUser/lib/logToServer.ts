// Server-side telemetry, in two pieces:
//   logWithThrottledNotification() — the notification core: logs an event to the server console and,
//                 unless `suppressNotification` is set, sends a throttled alert email. Callable
//                 directly from server code. Notifying is the default because that email is the only
//                 thing the core offers over a plain console.log, so calling it is itself the request
//                 to be notified.
//   logToServer — the client's door to it: a createServerFn that captures the calling browser's
//                 User-Agent from the request and delegates to the core. Fire-and-forget from the
//                 client (no await, no UI impact). In production, console output goes to whatever
//                 captures stdout/stderr.

import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import * as v from 'valibot';
// Nothing here may import env.ts. env.ts imports this module statically, so an import back would
// close a cycle — which is what the app name in the subject below used to do, before it started
// coming from getEmailEnvironmentVars with the rest of the email's configuration.
import { getDeviceType } from '~stzUtils/lib/getDeviceType';

// Two sliding windows over every alert email, whatever its message: 2 a minute stops a burst, 8 per
// 13 minutes caps a long storm — Steve, 2026-11-19. They replaced a 15-minute cooldown per message
// and 20 an hour: the cooldown let one failure stand for every later one of its kind, and so hid two
// of a run's three failed coach comments. Every email is counted together, so a noisy message can
// crowd out others; that is a bug in the noisy message, and the log keeps what the email holds back.
// `halt` is the notice's wording for the email that fills the window. Tune by editing.
export const THROTTLE_WINDOWS = [
  { limit: 2, ms: 60 * 1000, halt: 'a minute' },
  { limit: 8, ms: 13 * 60 * 1000, halt: '13 minutes' },
] as const;

// In-memory throttle state, one server instance's: it resets on deploy and whenever the host starts
// a fresh instance, as Netlify does freely. Best-effort alerts.
const sentEmailTimestamps: number[] = [];

// The client door's input. `notify` stays opt-IN here — the ~20 browser callers are quiet by default
// and only a few ask to be emailed — and the door inverts it into the core's opt-OUT
// `suppressNotification`. No `source`: the door always stamps 'Client'; server callers reach the core
// directly and stamp 'Server' themselves, so the tag never lies about origin.
export const LogSchema = v.object({
  level: v.picklist(['error', 'warn', 'info']),
  message: v.string(),
  context: v.optional(v.record(v.string(), v.unknown())),
  notify: v.optional(v.boolean()),
  // The real device type. The logToServer wrapper stamps this on every call (getDeviceType), so it
  // rides in like a field but is never set by callers — unlike userAgent, which the transport reads
  // server-side. The iPad-unmasking signals (touch, iOS APIs) live only in the browser, so this one
  // can't be read from headers; the client-side wrapper has to hand it over.
  device: v.optional(v.string()),
});

// What the core logs. The client door builds one from LogSchema plus the captured User-Agent;
// server callers construct one directly.
export type LogEvent = {
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: Record<string, unknown>;
  // Opt OUT of the notification email. The default is to send it: the email is the whole reason to
  // call the core rather than console.log, so notifying is the sensible default and silence is the ask.
  suppressNotification?: boolean;
  // Console origin tag: 'Client' (browser telemetry via the door, the default) vs 'Server'.
  source?: 'Client' | 'Server';
  // The calling browser's User-Agent, captured by the door. Server callers omit it.
  userAgent?: string;
  // The real device type the client sent (getDeviceType) — names the machine the UA masquerade hides.
  device?: string;
};

const LONGEST_WINDOW_MS = Math.max(...THROTTLE_WINDOWS.map((window) => window.ms));

/** How many emails went out within each window, ending at t. Forgets those older than every window. */
function sentWithin(t: number): number[] {
  const recent = sentEmailTimestamps.filter((ts) => t - ts < LONGEST_WINDOW_MS);
  sentEmailTimestamps.length = 0;
  sentEmailTimestamps.push(...recent);
  return THROTTLE_WINDOWS.map((window) => recent.filter((ts) => t - ts < window.ms).length);
}

/** Whether every window has room for one more email. Records nothing: recordNotifySent does. */
export function checkThrottle(now?: number): boolean {
  const counts = sentWithin(now ?? Date.now());
  return THROTTLE_WINDOWS.every((window, i) => counts[i] < window.limit);
}

/**
 * The notice for an email that fills a window, in Steve's words, 2026-11-19, with the command that
 * reads what the halt held back. An email that fills both names the longer halt, the one to act on.
 * "Triggers" is loose, kept for its brevity. Undefined while every window keeps room after it.
 */
export function throttleNotice(now?: number): string | undefined {
  const t = now ?? Date.now();
  const counts = sentWithin(t);
  const filled = THROTTLE_WINDOWS.filter((window, i) => counts[i] + 1 >= window.limit);
  if (filled.length === 0) return undefined;
  const longest = filled.reduce((a, b) => (b.ms > a.ms ? b : a));
  const since = new Date(t).toISOString();
  const until = new Date(t + longest.ms).toISOString();
  return [
    `This message triggers an email throttle which will halt emails for ${longest.halt}. Look in the server logs for any un-mailed messages.`,
    `netlify logs --source functions --since ${since} --until ${until}`,
  ].join('\n');
}

/** Record that a notify email was sent. */
export function recordNotifySent(now?: number): void {
  sentEmailTimestamps.push(now ?? Date.now());
}

/** Reset throttle state — useful for tests. */
export function resetThrottleState(): void {
  sentEmailTimestamps.length = 0;
}

/**
 * Hand the event to the mailer. Two deliberate things here, both about keeping nodemailer out of
 * the browser.
 *
 * The import is dynamic because this module is loaded in the client: a top-level import of
 * anything that reaches the SMTP primitive drags nodemailer into the app shell, which is what
 * broke every page once.
 *
 * The import.meta.env.SSR guard is what stops a chunk being emitted for it at all. Vite replaces
 * that expression with a literal per build, so the whole block is eliminated from the client and
 * nodemailer is never written to the public directory. An `isServer()` check reads the same but
 * is a runtime call, so the bundler still has to emit the import behind it.
 */
async function sendNotifyEmail(event: LogEvent, notice?: string): Promise<void> {
  if (!import.meta.env.SSR) return;

  const { sendLogNotificationEmail } = await import('~stzUser/lib/notifyEmail.server');
  await sendLogNotificationEmail(event, notice);
}

/**
 * The notification core: log an event to the server console and, unless `suppressNotification` is
 * set, send a throttled alert email. Callable directly from server code with no HTTP boundary — the
 * Stripe webhook fulfillment alert uses it this way. The client reaches it through logToServer below.
 *
 * Only the *notification* is throttled, not yet the log — the name says so on purpose. Throttling the
 * log too would be a separate feature, not a quiet change to this one.
 */
export async function logWithThrottledNotification(event: LogEvent): Promise<void> {
  const tag = `[${event.source ?? 'Client'} ${event.level.toUpperCase()}]`;
  const ctx = event.context ? ' ' + JSON.stringify(event.context) : '';
  // device is deliberately email-only — it would just repeat on every high-frequency console log.
  const ua = event.userAgent ? ` [UA: ${event.userAgent}]` : '';
  console[event.level](`${tag} ${event.message}${ctx}${ua}`);

  if (event.suppressNotification) return;

  const now = Date.now();
  if (!checkThrottle(now)) return;

  try {
    await sendNotifyEmail(event, throttleNotice(now));
    recordNotifySent(now);
  } catch (error) {
    console.warn(`[logWithThrottledNotification] Failed to send notify email for "${event.message}":`, error);
  }
}

/**
 * The HTTP transport for client telemetry — private on purpose: everything goes through the
 * logToServer wrapper below, which stamps the device. Captures the calling browser's User-Agent from
 * the request headers — the browser and version — and delegates to logWithThrottledNotification,
 * stamping 'Client'. The client's opt-IN `notify` is inverted here into the core's opt-OUT
 * `suppressNotification`, so browser telemetry stays quiet unless a caller asks.
 */
const logToServerRpc = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(LogSchema, data))
  .handler(async ({ data }) => {
    const userAgent = getRequest()?.headers?.get('user-agent') ?? undefined;
    await logWithThrottledNotification({ ...data, suppressNotification: !data.notify, source: 'Client', userAgent });
  });

/**
 * The client's door to server telemetry — what every caller uses. Stamps the real device type
 * client-side (getDeviceType, where navigator lives) and forwards to the transport, so device rides
 * every alert automatically: no caller has to remember it, mirroring how the transport captures the
 * User-Agent server-side. `device` is owned here, so callers pass everything else and never set it.
 */
export function logToServer(opts: { data: Omit<v.InferInput<typeof LogSchema>, 'device'> }) {
  return logToServerRpc({ data: { ...opts.data, device: getDeviceType() } });
}
