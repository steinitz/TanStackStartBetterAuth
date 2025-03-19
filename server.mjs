import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`
config({ path: join(__dirname, envFile) })

// Import and run the server
import('./.output/server/index.mjs') 