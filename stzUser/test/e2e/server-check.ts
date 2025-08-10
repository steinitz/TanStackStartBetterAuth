import { chromium, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

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

/**
 * Automatically start development server if not already running
 * @param baseURL - The URL to check (defaults to http://localhost:3000)
 * @returns Promise that resolves when server is ready
 */
export async function ensureServerRunning(baseURL: string = 'http://localhost:3000'): Promise<void> {
  console.log(`Checking if server is running on ${baseURL}...`);
  
  // First check if server is already running
  if (await checkServerStatus(baseURL)) {
    console.log('✅ Server is already running and responding correctly');
    return;
  }
  
  console.log('🚀 Server not detected, starting development server...');
  
  // Start the development server with visible output for debugging
  const serverProcess = spawn('pnpm', ['dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      PLAYWRIGHT_RUNNING: 'true'  // Flag to indicate server was started by Playwright tests
    }
  });

  // Pipe server output to console with prefixes
  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`[DEV SERVER] ${data.toString().trim()}`);
    });
  }
  
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(`[DEV SERVER ERROR] ${data.toString().trim()}`);
    });
  }

  serverProcess.unref();
  
  // Wait for server to start (with timeout)
  const maxAttempts = 30; // 30 seconds
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await sleep(1000); // Wait 1 second
    attempts++;
    
    if (await checkServerStatus(baseURL)) {
      console.log('✅ Development server started successfully');
      return;
    }
    
    console.log(`⏳ Waiting for server to start... (${attempts}/${maxAttempts})`);
  }
  
  throw new Error('Failed to start development server within timeout period');
}