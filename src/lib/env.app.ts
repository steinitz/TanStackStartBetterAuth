import {
  computeClientEnv,
  isNodeLikeRuntime,
  reportEnvProblems,
  requireInjectedEnv,
  isServer,
  type ClientEnv,
} from '~stzUser/lib/env';

export type AppClientEnv = ClientEnv & {
  // Add application specific keys here
  // e.g. MY_FEATURE_KEY: string;
};

// Extend the shared client-env computation with application-specific values.
//
// An app with money keys of its own writes its own rules and *merges* the resulting problems onto
// the shared list — `envProblems: [...base.envProblems, ...findAppEnvProblems()]` — rather than
// spreading over the top of it, which would silently discard everything stzUser found.
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

// The signal is data, and data emits nothing. This call is its owner, and it belongs *here* rather
// than in stzUser because this module is the only one that knows the complete list — shared keys
// plus whatever the app added. Server-only and non-throwing; see reportEnvProblems.
reportEnvProblems(clientEnv.envProblems);
