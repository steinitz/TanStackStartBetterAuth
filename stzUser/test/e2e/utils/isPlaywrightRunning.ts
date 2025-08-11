/**
 * Function to detect if we're running under Playwright tests
 * Now simplified to rely on PLAYWRIGHT_RUNNING from .env.test
 */
export function isPlaywrightRunning(): boolean {
  return process.env.PLAYWRIGHT_RUNNING === 'true';
}
