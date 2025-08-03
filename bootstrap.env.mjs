import * as dotenv from 'dotenv'

// Load environment variables before importing the server
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` })

// Now import and start the server
import('./.output/server/index.mjs') 