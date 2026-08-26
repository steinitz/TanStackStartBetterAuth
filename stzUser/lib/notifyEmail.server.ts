// The alert email behind logWithThrottledNotification, in a module a browser never loads.
//
// It lives apart from logToServer.ts for the reason mail.server.ts states: nothing a browser can
// load may import the SMTP primitive at the top level. logToServer.ts is loaded in the browser, so
// it reaches this file with `await import()` behind an `import.meta.env.SSR` guard, and the client
// build emits nothing for either.
//
// Keeping it here also keeps the build quiet. A dynamic import inside an eagerly-loaded module,
// naming something that other server modules import statically, makes Rollup warn that the dynamic
// import cannot move the module into a chunk of its own. This file is dynamically imported and
// statically imported by nobody, so the import of mail.server below is an ordinary static one.

import type { LogEvent } from '~stzUser/lib/logToServer';
import { sendEmail, getEmailEnvironmentVars } from '~stzUser/lib/mail.server';

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

/** Send a plain-text notify email. Server-only, like sendEmail itself. */
export async function sendLogNotificationEmail(event: LogEvent): Promise<void> {
  const env = getEmailEnvironmentVars();
  const source = deploymentSource();
  await sendEmail({
      from: env.from,
      to: env.supportEmailAddress || env.from,
      // Deployment label rides in the subject so the source is clear at a glance in the inbox.
      subject: `[${env.appName} · ${source.label}] ${event.message}`,
      text: [
        // Device leads (the question we actually ask); the raw UA is demoted to a forensic line at
        // the bottom — it's the only carrier of browser+version, but no longer the device answer.
        `Message: ${event.message}`,
        event.device ? `Device: ${event.device}` : null,
        `Level: ${event.level}`,
        `Source: ${source.label} (${source.url})`,
        event.context ? `Context: ${JSON.stringify(event.context)}` : null,
        event.userAgent ? `User-Agent: ${event.userAgent}` : null,
        `Timestamp: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n'),
    });
}
