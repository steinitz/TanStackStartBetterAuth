import { chromium, Page } from '@playwright/test';

/**
 * Utility to verify that the development server is running and responding
 * @param baseURL - The URL to check (defaults to http://localhost:3000)
 * @returns Promise that resolves if server is running, rejects if not
 */
export async function verifyServerRunning(baseURL: string = 'http://localhost:3000'): Promise<void> {
  console.log(`Checking if server is running on ${baseURL}...`);
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    if (!response || !response.ok()) {
      throw new Error(`Server responded with status ${response?.status()}`);
    }
    
    console.log('✅ Server is running and responding correctly');
  } catch (error) {
    console.error('❌ Server is not running or not responding properly');
    console.error('Please start the development server with `pnpm dev`');
    throw new Error(`Server check failed: ${error}`);
  } finally {
    await browser.close();
  }
}

/**
 * Lightweight server check using fetch (for use within test contexts)
 * @param baseURL - The URL to check
 * @returns Promise that resolves if server is running
 */
export async function checkServerStatus(baseURL: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    const response = await fetch(baseURL);
    return response.ok;
  } catch {
    return false;
  }
}