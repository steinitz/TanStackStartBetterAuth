import { FullConfig } from '@playwright/test';

/**
 * Global test teardown that handles cleanup after all tests complete
 * Shuts down dev server (only) while leaving Mailpit running for development
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Starting E2E Test Environment Teardown');
  console.log('=' .repeat(50));
  
  try {
    // Phase 1: Stop development server
    console.log('\n🛑 Phase 1: Development Server Shutdown');
    await stopDevServer();
    
    // Phase 2: Leave Mailpit running (useful for development)
    console.log('\n📧 Phase 2: Email Service Status');
    console.log('   • Mailpit server: Left running for development use');
    console.log('   • Web interface: http://localhost:8025');
    console.log('   • To stop manually: pkill mailpit');
    
    console.log('\n✅ E2E Test Environment Teardown Complete');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n⚠️ Teardown Warning');
    console.error('=' .repeat(50));
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Note: This is usually not critical for test results');
    console.error('=' .repeat(50));
  }
}

/**
 * Stop the development server by finding and terminating the process
 * Forcefully stops the server to ensure clean state between test runs
 */
async function stopDevServer(): Promise<void> {
  try {
    // Check if we have a test environment server running
    const baseURL = 'http://localhost:3000';
    const testEnvResponse = await fetch(`${baseURL}/api/test-env`);
    
    if (testEnvResponse.ok) {
      const testEnvData = await testEnvResponse.json();
      
      if (testEnvData.isPlaywrightRunning) {
        console.log('   • Found test environment server - stopping it');
        
        // Forcefully stop the development server to prevent intermittent test failures
        const { spawn } = require('child_process');
        const killProcess = spawn('pkill', ['-f', 'vite.*dev'], { stdio: 'pipe' });
        
        await new Promise((resolve) => {
          killProcess.on('close', (code) => {
            if (code === 0) {
              console.log('   • Development server stopped successfully');
            } else {
              console.log('   • No matching development server process found');
            }
            resolve(void 0);
          });
        });
        
        // Give the process time to fully terminate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log('   • Server running but not in test mode, leaving it running');
      }
    } else {
      console.log('   • No development server detected on port 3000');
    }
    
  } catch (error) {
    console.log('   • Development server already stopped or not accessible');
  }
}

export default globalTeardown;