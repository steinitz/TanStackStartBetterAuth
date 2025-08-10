/**
 * Function to detect if we're running under Playwright tests
 * Checks various environment variables and conditions that indicate test execution
 */
export function isPlaywrightRunning(): boolean {
  const isTest = !!(
    process.env.NODE_ENV === 'test' ||           // Traditional test environment
    process.env.PLAYWRIGHT_TEST_BASE_URL ||      // Playwright sets this when using baseURL
    process.env.PWTEST_SKIP_TEST_OUTPUT ||       // Playwright internal variable
    process.env.CI ||                            // Common in CI environments where Playwright runs
    process.env.PLAYWRIGHT ||                    // Custom variable we can set
    process.env.PLAYWRIGHT_RUNNING ||            // Custom flag we can set
    (typeof globalThis !== 'undefined' &&
      globalThis.process?.env?.npm_lifecycle_event?.includes('test')) || // npm test scripts
    // Check if we're in a development server that was likely started by tests
    (
      process.env.NODE_ENV === 'development' &&
      process.env.npm_lifecycle_event === 'dev' &&
      process.argv.some(arg => arg.includes('playwright') || arg.includes('test'))
    )
  )

  // Optional debug logging (uncomment if needed for troubleshooting)
  // console.log('🔍 Environment check:', {
  //   NODE_ENV: process.env.NODE_ENV,
  //   PLAYWRIGHT_RUNNING: process.env.PLAYWRIGHT_RUNNING,
  //   isPlaywrightDetected: isTest
  // });

  return isTest;
}
