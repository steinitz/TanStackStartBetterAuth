import {
  computeClientEnv,
  isNodeLikeRuntime,
  requireInjectedEnv,
  isServer,
  type ClientEnv,
} from '~stzUser/lib/env';

export type AppClientEnv = ClientEnv & {
  // Add application specific keys here
  // e.g. MY_FEATURE_KEY: string;
};

// Extend the shared client-env computation with application-specific values.
function computeAppClientEnv(): AppClientEnv {
  return {
    ...computeClientEnv(),

    // Add application specific values here
    // e.g. MY_FEATURE_KEY: process.env.MY_FEATURE_KEY || 'default',
  };
}

// Same contract as the shared env: server and Node-like tests compute; a real browser requires
// the complete root-injected object (shared keys plus any app keys) and fails loudly otherwise.
export const clientEnv: AppClientEnv =
  isServer() || isNodeLikeRuntime()
    ? computeAppClientEnv()
    : requireInjectedEnv(window.__ENV, computeAppClientEnv, 'appClientEnv');
