import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global test teardown that handles cleanup after all tests complete
 * Shuts down dev server (only) while leaving Mailpit running for development
 */
async function globalTeardown(config: FullConfig) {
  try {
    await stopDevServer();
    
    // Clean up test database
    const dbPath = path.resolve(process.cwd(), 'test-e2e.db');
    const dbFiles = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`];
    
    dbFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.warn(`Warning: Could not remove ${path.basename(file)}:`, err instanceof Error ? err.message : String(err));
        }
      }
    });
    
  } catch (error) {
    console.error('Teardown warning:', error instanceof Error ? error.message : String(error));
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
        // Forcefully stop the development server to prevent intermittent test failures
        const { spawn } = require('child_process');
        const killProcess = spawn('pkill', ['-f', 'vite.*dev'], { stdio: 'pipe' });
        
        await new Promise((resolve) => {
          killProcess.on('close', () => {
            resolve(void 0);
          });
        });
        
        // Give the process time to fully terminate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch {
    // Server already stopped or not accessible — nothing to do
  }
}

export default globalTeardown;