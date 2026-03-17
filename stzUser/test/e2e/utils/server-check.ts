import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);
const execAsync = promisify(exec);

/**
 * Find process ID running on a specific port
 * @param port - The port number to check (defaults to 3000)
 * @returns Promise that resolves to process ID or null if not found
 */
export async function findProcessOnPort(port: number = 3000): Promise<number | null> {
  try {
    // Use lsof to find process on port (works on macOS and Linux)
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pid = stdout.trim();
    return pid ? parseInt(pid, 10) : null;
  } catch {
    // If lsof fails, try netstat approach (fallback)
    try {
      const { stdout } = await execAsync(`netstat -tulpn 2>/dev/null | grep :${port}`);
      const match = stdout.match(/\s+(\d+)\//);
      return match ? parseInt(match[1], 10) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Terminate a process gracefully, then forcefully if needed
 * @param pid - Process ID to terminate
 * @param timeoutMs - Timeout in milliseconds before using SIGKILL (defaults to 5000)
 * @returns Promise that resolves when process is terminated
 */
export async function terminateProcess(pid: number, timeoutMs: number = 5000): Promise<void> {
  try {
    // First try graceful termination with SIGTERM
    process.kill(pid, 'SIGTERM');
    console.log(`📤 Sent SIGTERM to process ${pid}`);

    // Wait for graceful shutdown
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if process still exists (will throw if not)
        process.kill(pid, 0);
        await sleep(100); // Wait 100ms before checking again
      } catch {
        // Process no longer exists - graceful termination succeeded
        console.log(`✅ Process ${pid} terminated gracefully`);
        return;
      }
    }

    // If we reach here, graceful termination failed - use SIGKILL
    console.log(`⚠️  Process ${pid} didn't respond to SIGTERM, using SIGKILL`);
    process.kill(pid, 'SIGKILL');
    console.log(`💀 Sent SIGKILL to process ${pid}`);

    // Wait a bit to ensure process is killed
    await sleep(500);

  } catch (error: any) {
    if (error.code === 'ESRCH') {
      // Process doesn't exist - already terminated
      console.log(`✅ Process ${pid} was already terminated`);
      return;
    } else if (error.code === 'EPERM') {
      throw new Error(`Permission denied: Cannot terminate process ${pid}. Try running with elevated privileges.`);
    } else {
      throw new Error(`Failed to terminate process ${pid}: ${error.message}`);
    }
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
        headers: {
          'Content-Type': 'application/json',
          'x-turnstile-token': '1x00000000000000000000AA'
        },
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

  // If not ready, check if ANY process is occupying the port
  const url = new URL(baseURL);
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  const pid = await findProcessOnPort(port);

  if (pid) {
    if (process.env.SKIP_SERVER_TERMINATION_COUNTDOWN === 'true') {
      console.log(`⚠️  Port ${port} is occupied. Auto-terminating process ${pid} due to SKIP_SERVER_TERMINATION_COUNTDOWN=true`);
      await terminateProcess(pid);
      await sleep(1000);
    } else {
      console.log(`⚠️  Port ${port} is occupied by process ${pid}.`);
      console.log('🔄 Starting countdown to auto-terminate server...');
      for (let i = 10; i > 0; i--) {
        console.log(`⏰ Terminating server in ${i} seconds... (Ctrl+C to cancel)`);
        await sleep(1000);
      }
      console.log('🛑 Terminating existing server...');
      await terminateProcess(pid);
      await sleep(1000);
    }
  }

  console.log('🚀 Server not detected or ready, starting development server with .env.test...');

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
  const maxAttempts = 5; // 5 seconds should be sufficient for development
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
}