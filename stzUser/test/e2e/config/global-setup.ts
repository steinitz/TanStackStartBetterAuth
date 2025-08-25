import { FullConfig } from '@playwright/test';
import { ensureServerRunning, ensureMailpitRunning } from 'stzUser/test/e2e/utils/server-check';

/**
 * Global test setup that orchestrates server and service startup
 * Ensures all required services are running before any tests execute
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting E2E Test Environment Setup');
  console.log('=' .repeat(50));
  
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  try {
    // Phase 1: Start Mailpit (email testing dependency)
    console.log('\n📧 Phase 1: Email Service Setup');
    await ensureMailpitRunning();
    
    // Phase 2: Start development server with test environment
    console.log('\n🌐 Phase 2: Development Server Setup');
    await ensureServerRunning(baseURL);
    
    // Phase 3: Environment validation
    console.log('\n✅ Phase 3: Environment Validation');
    console.log(`   • Server URL: ${baseURL}`);
    console.log(`   • Mailpit API: http://localhost:8025`);
    console.log(`   • SMTP Server: localhost:1025`);
    console.log(`   • Test Environment: ${process.env.PLAYWRIGHT_RUNNING === 'true' ? 'Active' : 'Inactive'}`);
    
    console.log('\n🎯 E2E Test Environment Ready');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Global Setup Failed');
    console.error('=' .repeat(50));
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\n💡 Troubleshooting Tips:');
    console.error('   • Ensure no other services are using ports 3000, 8025, or 1025');
    console.error('   • Check that .env.test file exists and contains PLAYWRIGHT_RUNNING=true');
    console.error('   • Verify mailpit is installed: brew install mailpit (macOS)');
    console.error('   • Try manually starting: pnpx dotenv-cli -e .env.test -- pnpm dev');
    console.error('=' .repeat(50));
    
    // Re-throw to fail the test suite
    throw error;
  }
}

export default globalSetup;
