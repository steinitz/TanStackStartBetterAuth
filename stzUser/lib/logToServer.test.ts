import { beforeEach, describe, expect, it } from 'vitest';
import { THROTTLE_WINDOWS, checkThrottle, recordNotifySent, resetThrottleState, throttleNotice } from 'stzUser/lib/logToServer';

const [BURST, STORM] = THROTTLE_WINDOWS;

/** Sends `count` emails `gapMs` apart from `start`, as the core does: check, then record. */
function send(count: number, start: number, gapMs: number): number {
  let t = start;
  for (let i = 0; i < count; i++) {
    expect(checkThrottle(t)).toBe(true);
    recordNotifySent(t);
    t += gapMs;
  }
  return t - gapMs;
}

describe('checkThrottle', () => {
  beforeEach(() => {
    resetThrottleState();
  });

  it('allows the first email', () => {
    expect(checkThrottle(1000)).toBe(true);
  });

  it('allows the same message again at once: there is no cooldown per message', () => {
    // The 2026-11-18 case: three failed coach comments, minutes apart, all of one message.
    send(1, 0, 0);
    expect(checkThrottle(9 * 60 * 1000)).toBe(true);
  });

  it('holds the burst window full until its first email ages out', () => {
    const last = send(BURST.limit, 0, 1000);
    expect(checkThrottle(last + 1)).toBe(false);
    expect(checkThrottle(BURST.ms - 1)).toBe(false);
    expect(checkThrottle(BURST.ms)).toBe(true);
  });

  it('holds the storm window full until its first email ages out', () => {
    // Spaced past the burst window, so only the storm window can fill.
    const gap = BURST.ms;
    const last = send(STORM.limit, 0, gap);
    expect(checkThrottle(last + gap)).toBe(false);
    expect(checkThrottle(STORM.ms - 1)).toBe(false);
    expect(checkThrottle(STORM.ms)).toBe(true);
  });

  it('records nothing by itself: only recordNotifySent does', () => {
    for (let i = 0; i <= STORM.limit; i++) expect(checkThrottle(i)).toBe(true);
  });

  it('starts empty after a reset', () => {
    send(BURST.limit, 0, 0);
    resetThrottleState();
    expect(checkThrottle(1)).toBe(true);
  });
});

describe('throttleNotice', () => {
  beforeEach(() => {
    resetThrottleState();
  });

  it('says nothing while the email leaves room in every window', () => {
    expect(throttleNotice(0)).toBeUndefined();
  });

  it('names a minute on the email that fills the burst window, with the logs for that minute', () => {
    send(BURST.limit - 1, 0, 0);
    const t = Date.UTC(1970, 0, 1, 0, 0, 1);
    expect(throttleNotice(t)).toBe(
      `This message triggers an email throttle which will halt emails for ${BURST.halt}. Look in the server logs for any un-mailed messages.\n` +
      `netlify logs --source functions --since ${new Date(t).toISOString()} --until ${new Date(t + BURST.ms).toISOString()}`,
    );
    expect(BURST.halt).toBe('a minute');
  });

  it('names 13 minutes on the email that fills the storm window alone', () => {
    const last = send(STORM.limit - 1, 0, BURST.ms);
    const notice = throttleNotice(last + BURST.ms);
    expect(notice).toContain(`halt emails for ${STORM.halt}.`);
    expect(STORM.halt).toBe('13 minutes');
  });

  it('names the longer halt on an email that fills both windows at once', () => {
    // Seven spaced out, then one just before this: this email is the 2nd in a minute and the 8th in 13.
    const last = send(STORM.limit - 2, 0, BURST.ms);
    send(1, last + BURST.ms, 0);
    expect(throttleNotice(last + BURST.ms + 1000)).toContain(`halt emails for ${STORM.halt}.`);
  });
});
