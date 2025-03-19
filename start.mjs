import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`
config({ path: join(__dirname, envFile) })

// Start the server
const server = spawn('node', ['.output/server/index.mjs'], {
  stdio: 'inherit',
  env: process.env
})

server.on('error', (err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

server.on('exit', (code) => {
  process.exit(code)
}) 