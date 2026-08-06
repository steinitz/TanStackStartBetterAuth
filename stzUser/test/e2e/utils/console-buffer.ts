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
 *
 * It can also FAIL a test on output a project considers fatal — see
 * `fatalConsolePatterns`.  That is off unless a project asks for it, so a
 * config that says nothing keeps exactly the behaviour this fixture has
 * always had.
 */

import { test as base } from '@playwright/test';

export type ConsoleBufferOptions = {
  /**
   * Patterns meaning the page broke in a way no test should tolerate.  When a
   * console message or an uncaught page error matches one, the test fails with
   * the offending line quoted, whatever else it went on to assert.
   *
   * Empty by default.  A project opts in from its Playwright config:
   *
   *   use: { fatalConsolePatterns: [/RuntimeError: unreachable/] }
   *
   * Arming it there rather than per spec is the whole point.  A spec written
   * later inherits the guard without having to remember it, and a guard you
   * can forget to import is hard to tell apart from one that is working.
   *
   * Strings match as substrings; regexes match with `.test`.
   */
  fatalConsolePatterns: (string | RegExp)[];
};

export const test = base.extend<ConsoleBufferOptions & { _consoleBuffer: void }>({
  fatalConsolePatterns: [[], { option: true }],

  // Auto-fixture — runs for every test without the test referencing it.
  // The leading underscore signals "not consumed directly by tests."
  _consoleBuffer: [async ({ page, fatalConsolePatterns }, use, testInfo) => {
    const messages: string[] = [];
    const fatal: string[] = [];

    const isFatal = (line: string) =>
      fatalConsolePatterns.some((pattern) =>
        typeof pattern === 'string' ? line.includes(pattern) : pattern.test(line),
      );

    const record = (line: string) => {
      messages.push(line);
      if (fatalConsolePatterns.length > 0 && isFatal(line)) fatal.push(line);
    };

    page.on('console', (msg) => record(`[${msg.type()}] ${msg.text()}`));
    // An uncaught exception never reaches `console`, so a guard watching only
    // that channel would miss a page which died rather than complained.
    page.on('pageerror', (err) => record(`[pageerror] ${err.message}`));

    await use();

    // Flush buffered messages only when the test failed
    if (testInfo.status !== testInfo.expectedStatus && messages.length > 0) {
      console.log(`\n--- Browser console (${testInfo.title}) ---`);
      for (const m of messages) {
        console.log(m);
      }
      console.log('--- end browser console ---\n');
    }

    if (fatal.length > 0) {
      // Fail the test that was running when the page broke, rather than let it
      // report on whatever it happened to be asserting at the time.
      throw new Error(
        `Fatal console output during "${testInfo.title}":\n` +
        fatal.map((line) => `  ${line}`).join('\n'),
      );
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
