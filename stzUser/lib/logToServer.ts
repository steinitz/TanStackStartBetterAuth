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
import { sendEmail, getEmailEnvironmentVars } from '~stzUser/lib/mail-utilities';
import { clientEnv } from '~stzUser/lib/env';

// Throttle constants — tune by editing.
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes per-key cooldown
const MAX_PER_HOUR = 20;             // global ceiling
const HOUR_MS = 60 * 60 * 1000;

// In-memory throttle state (resets on deploy — best-effort alerts).
const notifyCooldowns = new Map<string, number>();
const hourlyEmailTimestamps: number[] = [];

// The client door's input. `notify` stays opt-IN here — the ~20 browser callers are quiet by default
// and only a few ask to be emailed — and the door inverts it into the core's opt-OUT
// `suppressNotification`. No `source`: the door always stamps 'Client'; server callers reach the core
// directly and stamp 'Server' themselves, so the tag never lies about origin.
export const LogSchema = v.object({
  level: v.picklist(['error', 'warn', 'info']),
  message: v.string(),
  context: v.optional(v.record(v.string(), v.unknown())),
  notify: v.optional(v.boolean()),
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
};

/** Check whether a message passes both throttle layers. Returns true if the email should be sent. */
export function checkThrottle(message: string, now?: number): boolean {
  const t = now ?? Date.now();

  // Per-key cooldown check.
  const lastSent = notifyCooldowns.get(message);
  if (lastSent !== undefined && t - lastSent < COOLDOWN_MS) return false;

  // Global ceiling: filter stale entries then count.
  const recentTimestamps = hourlyEmailTimestamps.filter(ts => t - ts < HOUR_MS);
  hourlyEmailTimestamps.length = 0;
  hourlyEmailTimestamps.push(...recentTimestamps);
  if (recentTimestamps.length >= MAX_PER_HOUR) return false;

  return true;
}

/** Record that a notify email was sent for the given message. */
export function recordNotifySent(message: string, now?: number): void {
  const t = now ?? Date.now();
  notifyCooldowns.set(message, t);
  hourlyEmailTimestamps.push(t);
}

/** Reset throttle state — useful for tests. */
export function resetThrottleState(): void {
  notifyCooldowns.clear();
  hourlyEmailTimestamps.length = 0;
}

/**
 * Which deployment sent this alert. Sourced from BETTER_AUTH_URL — the one env var we
 * already keep per-site precisely because determining the origin at run time was fraught.
 * The production host is app-specific, so it's named via the optional PRODUCTION_HOST env
 * (e.g. PRODUCTION_HOST=chesshurdles.com); when the deployment host matches, the label is
 * 'prod'. localhost/127 always reads 'dev'. Anything else — stage, a preview, or prod with
 * PRODUCTION_HOST unset — shows its raw host, which is already unambiguous and needs no
 * mapping to maintain. Returns the short label plus the full URL so the email can show both
 * (label in the subject, URL in the body).
 */
export function deploymentSource(): { label: string; url: string } {
  const url = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  let host: string;
  try { host = new URL(url).host; } catch { host = url; }
  const prodHost = process.env.PRODUCTION_HOST;
  const label =
    (prodHost && (host === prodHost || host === `www.${prodHost}`)) ? 'prod'
    : host.startsWith('localhost') || host.startsWith('127.') ? 'dev'
    : host; // stage / preview / unconfigured prod: the raw host is the clearest label there is
  return { label, url };
}

/** Send a plain-text notify email via the project's blessed sendEmail server fn. */
async function sendNotifyEmail(event: LogEvent): Promise<void> {
  const env = await getEmailEnvironmentVars({ data: undefined });
  const source = deploymentSource();
  await sendEmail({
    data: {
      from: env.from,
      to: env.supportEmailAddress || env.from,
      // Deployment label rides in the subject so the source is clear at a glance in the inbox.
      subject: `[${clientEnv.APP_NAME} · ${source.label}] ${event.message}`,
      text: [
        `Source: ${source.label} (${source.url})`,
        `Level: ${event.level}`,
        `Message: ${event.message}`,
        event.userAgent ? `User-Agent: ${event.userAgent}` : null,
        event.context ? `Context: ${JSON.stringify(event.context)}` : null,
        `Timestamp: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n'),
    },
  });
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
  const ua = event.userAgent ? ` [UA: ${event.userAgent}]` : '';
  console[event.level](`${tag} ${event.message}${ctx}${ua}`);

  if (event.suppressNotification) return;

  const now = Date.now();
  if (!checkThrottle(event.message, now)) return;

  try {
    await sendNotifyEmail(event);
    recordNotifySent(event.message, now);
  } catch (error) {
    console.warn(`[logWithThrottledNotification] Failed to send notify email for "${event.message}":`, error);
  }
}

/**
 * The client's door to the core: browser telemetry over an HTTP POST. Captures the calling browser's
 * User-Agent from the request headers — so alerts can name the device — and delegates to
 * logWithThrottledNotification, stamping 'Client'. The client's opt-IN `notify` is inverted here into
 * the core's opt-OUT `suppressNotification`, so browser telemetry stays quiet unless a caller asks.
 */
export const logToServer = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(LogSchema, data))
  .handler(async ({ data }) => {
    const userAgent = getRequest()?.headers?.get('user-agent') ?? undefined;
    await logWithThrottledNotification({ ...data, suppressNotification: !data.notify, source: 'Client', userAgent });
  });
