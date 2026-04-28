/**
 * Console Buffer — central Playwright fixture for browser console output.
 *
 * Buffers all browser console messages per test and only flushes them to
 * stdout when a test fails.  Specs opt-in by importing `test` and `expect`
 * from this module instead of from `@playwright/test`.
 *
 * Usage:
 *   import { test, expect } from '~stzUser/test/e2e/utils/console-buffer';
 *   // or, from upstream specs:
 *   import { test, expect } from './utils/console-buffer';
 */

import { test as base } from '@playwright/test';

export const test = base.extend({
  // Auto-fixture — runs for every test without the test referencing it.
  // The leading underscore signals "not consumed directly by tests."
  _consoleBuffer: [async ({ page }, use, testInfo) => {
    const messages: string[] = [];

    page.on('console', (msg) => {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    });

    await use();

    // Flush buffered messages only when the test failed
    if (testInfo.status !== testInfo.expectedStatus && messages.length > 0) {
      console.log(`\n--- Browser console (${testInfo.title}) ---`);
      for (const m of messages) {
        console.log(m);
      }
      console.log('--- end browser console ---\n');
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
