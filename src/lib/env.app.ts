import { clientEnv as upstreamEnv, type ClientEnv as UpstreamClientEnv } from '~stzUser/lib/env';

export type AppClientEnv = UpstreamClientEnv & {
  // Add application specific keys here
  // e.g. MY_FEATURE_KEY: string;
};

// Extend the upstream client environment with application-specific variables
export const clientEnv: AppClientEnv = {
  ...upstreamEnv,

  // Add application specific values here
  // e.g. MY_FEATURE_KEY: process.env.MY_FEATURE_KEY || 'default',

  // Robustness: ensure we pick up any runtime injection for app specific values
  ...(typeof window !== 'undefined' && window.__ENV ? {
    // e.g. MY_FEATURE_KEY: (window.__ENV as any).MY_FEATURE_KEY ?? process.env.MY_FEATURE_KEY,
  } : {})
};
