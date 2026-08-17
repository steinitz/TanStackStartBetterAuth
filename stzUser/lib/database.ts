import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibsqlDialect } from "kysely-libsql";
import type { AdminSource } from './admin-identity';

// Initialize LibSQL client
const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// No fallback, in any environment. There used to be one — file:sqlite.db unless
// NODE_ENV was production — and it did not save anyone, because .env.example
// already carries that exact value for a new checkout to copy. What it did do
// was hide a missing line: ChessHurdles had DATABASE_URL commented out of its
// .env.development for months and nothing complained, because the fallback
// silently supplied the same string. A crash names the problem; a fallback
// answers a question nobody asked.
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy it from .env.example — a local file database is file:sqlite.db.",
  );
}

export const libsqlClient = createClient({
  url,
  authToken: authToken,
});

/**
 * User-related database types
 * 
 * All user-related TypeScript interfaces are consolidated here to:
 * 1. Provide a single source of truth for database schemas
 * 2. Simplify the migration to Kysely
 * 3. Separate database concerns from UI/client types
 */

// Database Types
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Extended user type with role information
export interface UserWithRole extends User {
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
}

// The authorized user-management view adds deployment-aware identity without
// pretending that Better Auth's stored `role` column contains that information.
export interface AdminManagedUser extends UserWithRole {
  adminSource: AdminSource;
}

// Better Auth listUsers response structure
export interface ListUsersResponse {
  users: UserWithRole[];
  total: number;
  limit: number | undefined;
  offset: number | undefined;
}

// Kysely Database Interface
export interface Database {
  user: UserTable;
  transactions: TransactionTable;
}

// Define the user table schema based on UserWithRole
export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string; // SQLite stores dates as strings
  updatedAt: string; // SQLite stores dates as strings
  role: string | null;
  banned: number | null; // SQLite stores booleans as 0/1
  banReason: string | null;
  banExpires: string | null; // SQLite stores dates as strings
  credits: number; // For performance-optimized balance access
  welcome_claimed: number; // Acting as boolean (0 or 1)
}

export interface TransactionTable {
  id: string;
  user_id: string;
  amount: number; // Positive for credits, negative for debits
  type: 'daily_grant' | 'consumption' | 'purchase' | 'manual_adjustment';
  description: string;
  created_at: string;
  stripe_payment_intent_id?: string | null; // webhook idempotency lock; NULL for non-Stripe rows
}


// Initialize Kysely instance
export const db = new Kysely<Database>({
  dialect: new LibsqlDialect({
    client: libsqlClient
  }),
});

// Enable WAL mode for better concurrency with local file-based LibSQL/SQLite.
// A local file DB is the no-URL default (file:sqlite.db) or an explicit file: URL.
// Any server URL — libsql://, http:// (local sqld via `turso dev`), ws:// — skips
// WAL: it's a file-level pragma and sqld's Hrana/HTTP API rejects it outright.
const isLocalFile = !url || url.startsWith('file:');

if (isLocalFile) {
  // Wrap in IIFE to avoid top-level await issues in some environments
  (async () => {
    try {
      // ALWAYS try to enable WAL for file: databases in tests/dev
      await libsqlClient.execute("PRAGMA journal_mode = WAL;");
    } catch (e) {
      console.error("Failed to enable WAL mode:", e);
    }
  })();
}
