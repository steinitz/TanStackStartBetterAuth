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
 * Comprehensive server readiness check that verifies multiple components
 * @param baseURL - The base URL to check
 * @returns Promise that resolves when server is fully ready
 */
export async function checkServerReadiness(baseURL: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    // 1. Basic HTTP connectivity
    const healthResponse = await fetch(baseURL);
    if (!healthResponse.ok) return false;

    // 2. Test environment validation
    const testEnvResponse = await fetch(`${baseURL}/api/test-env`);
    if (!testEnvResponse.ok) return false;
    const testEnvData = await testEnvResponse.json();
    if (!testEnvData.isPlaywrightRunning) return false;

    // 3. Better Auth API availability
    const authResponse = await fetch(`${baseURL}/api/auth`);
    if (authResponse.status === 0) return false; // Connection error

    // 4. Database connectivity test via a simple auth endpoint
    try {
      const dbTestResponse = await fetch(`${baseURL}/api/auth/session`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      // Should return some response (even if no session), not a connection error
      if (dbTestResponse.status === 0) return false;
    } catch {
      return false;
    }

    // 5. Better Auth signup endpoint operational test
    try {
      const signupTestResponse = await fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'readiness-test@example.com',
          password: 'TestPassword123!',
          name: 'Readiness Test'
        })
      });
      // Should return some response (success or validation error), not a connection error
      if (signupTestResponse.status === 0) return false;
      // Expect either success or validation error, not server error
      if (signupTestResponse.status >= 500) return false;
    } catch {
      return false;
    }

    return true;
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
  // First check if server is already running and fully ready
  if (await checkServerReadiness(baseURL)) {
    console.log('✅ Development server ready with test environment');
    return;
  }

  // Check if server is running but not ready
  if (await checkServerStatus(baseURL)) {
    const errorMessage = 'Server is running but not fully ready or not with test environment. Please restart your dev server with: pnpx dotenv-cli -e .env.test -- pnpm dev';
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
  const maxAttempts = 45; // 45 seconds for better-auth initialization
  let attempts = 0;
  let serverDetected = false;

  while (attempts < maxAttempts) {
    await sleep(1000); // Wait 1 second
    attempts++;

    // First check basic server availability
    if (!serverDetected && await checkServerStatus(baseURL)) {
      serverDetected = true;
      console.log('🌐 Server detected, waiting for full readiness...');
    }

    // Then check comprehensive readiness
    if (serverDetected && await checkServerReadiness(baseURL)) {
      // Additional stabilization time for better-auth and database
      console.log('🔄 Server ready, allowing stabilization time...');
      await sleep(2000); // 2 seconds for better-auth to fully initialize
      
      // Final readiness verification
      if (await checkServerReadiness(baseURL)) {
        console.log('✅ Development server started and fully ready');
        return;
      }
    }

    const status = serverDetected ? 'initializing components' : 'starting';
    console.log(`⏳ Waiting for server (${status})... (${attempts}/${maxAttempts})`);
  }

  throw new Error('Failed to start development server within timeout period');
}``