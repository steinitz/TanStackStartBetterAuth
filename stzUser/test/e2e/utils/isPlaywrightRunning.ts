/**
 * Function to detect if we're running under Playwright tests
 * Relies on the sanitized PLAYWRIGHT_RUNNING value established from .env.e2e.
 */
export function isPlaywrightRunning(): boolean {
  return process.env.PLAYWRIGHT_RUNNING === 'true';
}
