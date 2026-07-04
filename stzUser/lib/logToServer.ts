// Server-side telemetry: logs client events to the server console.
// Fire-and-forget from the client — no await needed, no UI impact.
// In production, output appears in whatever captures stdout/stderr.

import { createServerFn } from '@tanstack/react-start';
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

export const LogSchema = v.object({
  level: v.picklist(['error', 'warn', 'info']),
  message: v.string(),
  context: v.optional(v.record(v.string(), v.unknown())),
  notify: v.optional(v.boolean()),
  // Origin label for the console tag: 'Client' (browser telemetry, the default) vs 'Server'
  // (server-originated alerts, e.g. the Stripe webhook). This fn began as client-only telemetry, so
  // an unset source keeps the historical '[Client …]' tag; server callers pass 'Server' so the tag
  // doesn't lie about where the log came from.
  source: v.optional(v.string()),
});

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
async function sendNotifyEmail(data: { level: string; message: string; context?: Record<string, unknown> }): Promise<void> {
  const env = await getEmailEnvironmentVars({ data: undefined });
  const source = deploymentSource();
  await sendEmail({
    data: {
      from: env.from,
      to: env.supportEmailAddress || env.from,
      // Deployment label rides in the subject so the source is clear at a glance in the inbox.
      subject: `[${clientEnv.APP_NAME} · ${source.label}] ${data.message}`,
      text: [
        `Source: ${source.label} (${source.url})`,
        `Level: ${data.level}`,
        `Message: ${data.message}`,
        data.context ? `Context: ${JSON.stringify(data.context)}` : null,
        `Timestamp: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n'),
    },
  });
}

export const logToServer = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => v.parse(LogSchema, data))
  .handler(async ({ data }) => {
    const tag = `[${data.source ?? 'Client'} ${data.level.toUpperCase()}]`;
    const ctx = data.context ? ' ' + JSON.stringify(data.context) : '';
    console[data.level](`${tag} ${data.message}${ctx}`);

    if (!data.notify) return;

    const now = Date.now();
    if (!checkThrottle(data.message, now)) return;

    try {
      await sendNotifyEmail(data);
      recordNotifySent(data.message, now);
    } catch (error) {
      console.warn(`[logToServer] Failed to send notify email for "${data.message}":`, error);
    }
  });
