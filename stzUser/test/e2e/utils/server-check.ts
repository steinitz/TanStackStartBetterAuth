import {spawn, ChildProcess} from 'child_process';
import {promisify} from 'util';

const sleep = promisify(setTimeout);

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
 * Check if Mailpit server is running
 * @param mailpitURL - The Mailpit API URL to check (defaults to http://localhost:8025)
 * @returns Promise that resolves if Mailpit is running
 */
export async function checkMailpitStatus(mailpitURL: string = 'http://localhost:8025'): Promise<boolean> {
  try {
    const response = await fetch(`${mailpitURL}/api/v1/info`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Automatically start Mailpit server if not already running
 * @param mailpitURL - The Mailpit URL to check (defaults to http://localhost:8025)
 * @returns Promise that resolves when Mailpit is ready
 */
export async function ensureMailpitRunning(mailpitURL: string = 'http://localhost:8025'): Promise<void> {
  // First check if Mailpit is already running
  if (await checkMailpitStatus(mailpitURL)) {
    console.log('✅ Mailpit server already running');
    return;
  }

  console.log('🚀 Mailpit not detected, starting Mailpit server...');

  // Start Mailpit server
  const mailpitProcess = spawn('mailpit', [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    cwd: process.cwd()
  });

  // Pipe Mailpit output to console with prefixes
  if (mailpitProcess.stdout) {
    mailpitProcess.stdout.on('data', (data) => {
      console.log(`[mailpit] ${data.toString().trim()}`);
    });
  }

  if (mailpitProcess.stderr) {
    mailpitProcess.stderr.on('data', (data) => {
      console.error(`[mailpit error] ${data.toString().trim()}`);
    });
  }

  mailpitProcess.unref();

  // Wait for Mailpit to start (with timeout)
  const maxAttempts = 15; // 15 seconds should be enough for Mailpit
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(1000); // Wait 1 second
    attempts++;

    if (await checkMailpitStatus(mailpitURL)) {
      console.log('✅ Mailpit server started successfully');
      console.log('📧 SMTP server: localhost:1025');
      console.log('🌐 Web interface: http://localhost:8025');
      return;
    }

    console.log(`⏳ Waiting for Mailpit to start... (${attempts}/${maxAttempts})`);
  }

  throw new Error('Failed to start Mailpit server within timeout period');
}

/**
 * Automatically start development server if not already running
 * @param baseURL - The URL to check (defaults to http://localhost:3000)
 * @returns Promise that resolves when server is ready
 */
export async function ensureServerRunning(baseURL: string = 'http://localhost:3000'): Promise<void> {
  // First check if server is already running
  if (await checkServerStatus(baseURL)) {
    // Check if the running server is using test environment via API endpoint
    try {
      const response = await fetch(`${baseURL}/api/test-env`);
      if (response.ok) {
        const data = await response.json();
        if (data.isPlaywrightRunning) {
          console.log('✅ Development server ready with test environment');
          return;
        }
      }
    } catch {
      // Fall through to error handling
    }

    const errorMessage = 'Server is running but not with test environment. Please restart your dev server with: pnpx dotenv-cli -e .env.test -- pnpm dev';
    console.log(`⚠️  ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log('🚀 Server not detected, starting development server with .env.test...');

  // Start the development server with .env.test using dotenv-cli
  const serverProcess = spawn('pnpx', ['dotenv-cli', '-e', '.env.test', '--', 'pnpm', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    cwd: process.cwd()
  });

  // Pipe server output to console with prefixes
  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`[dev server] ${data.toString().trim()}`);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(`[dev server error] ${data.toString().trim()}`);
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