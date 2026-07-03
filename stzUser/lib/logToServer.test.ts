import { beforeEach, describe, expect, it } from 'vitest';
import { checkThrottle, recordNotifySent, resetThrottleState } from 'stzUser/lib/logToServer';

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const HOUR_MS = 60 * 60 * 1000;     // 1 hour

describe('checkThrottle', () => {
  beforeEach(() => {
    resetThrottleState();
  });

  it('allows first fire for a new key', () => {
    expect(checkThrottle('new.key', 1000)).toBe(true);
  });

  it('blocks same key within cooldown', () => {
    const now = 1000;
    recordNotifySent('key.a', now);

    // Still within cooldown (14 min later).
    expect(checkThrottle('key.a', now + 14 * 60 * 1000)).toBe(false);
  });

  it('allows same key after cooldown expires', () => {
    const now = 1000;
    recordNotifySent('key.a', now);

    // Just past cooldown (15 min + 1ms).
    expect(checkThrottle('key.a', now + COOLDOWN_MS + 1)).toBe(true);
  });

  it('allows different keys independently', () => {
    const now = 1000;
    recordNotifySent('key.a', now);

    // key.b is unaffected by key.a's cooldown.
    expect(checkThrottle('key.b', now)).toBe(true);
  });

  it('enforces global ceiling of 20 per hour', () => {
    const now = 1000;

    // Send 20 emails with distinct keys — all should pass.
    for (let i = 0; i < 20; i++) {
      expect(checkThrottle(`ceiling.key.${i}`, now)).toBe(true);
      recordNotifySent(`ceiling.key.${i}`, now);
    }

    // 21st email should be blocked by global ceiling.
    expect(checkThrottle('ceiling.key.overflow', now)).toBe(false);
  });

  it('resets global ceiling after one hour', () => {
    const now = 1000;

    // Fill the ceiling.
    for (let i = 0; i < 20; i++) {
      recordNotifySent(`reset.key.${i}`, now);
    }

    // Blocked at capacity.
    expect(checkThrottle('reset.blocked', now)).toBe(false);

    // One hour later, stale entries are pruned and ceiling resets.
    const afterHour = now + HOUR_MS + 1;
    expect(checkThrottle('reset.after.hour', afterHour)).toBe(true);
  });

  it('does not update throttle state on blocked calls', () => {
    // checkThrottle alone should not record anything — only recordNotifySent does.
    const now = 1000;

    expect(checkThrottle('no.record', now)).toBe(true);
    // Without calling recordNotifySent, the key is still fresh.
    expect(checkThrottle('no.record', now + 1)).toBe(true);
  });
});
