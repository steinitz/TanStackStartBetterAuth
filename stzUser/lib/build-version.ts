/**
 * Stamps each build, so a page can tell it is older than what the server now serves. See
 * app-update.ts, which reads the stamp.
 *
 * The same build writes the stamp twice: into the browser code, where it stays frozen for as long
 * as the page is open, and into `/version.json`, which every deploy replaces. A page whose stamp
 * differs from the file is from an older build.
 *
 * Netlify's commit hash names the build when there is one; a build made here has none. The time is
 * added either way, so two builds of one commit, a redeploy for an environment change, still
 * differ. The dev server gets no stamp, which turns the check off.
 *
 * Add it to the app's `vite.config.ts` plugins.
 */
import type { Plugin } from 'vite'

export const BUILD_VERSION_FILE = 'version.json'

export function buildVersion(): Plugin {
  // Kept in the process's environment, because one build evaluates the Vite config more than once,
  // and a stamp made at each would give the browser code one and `/version.json` another.
  process.env.STZ_BUILD_VERSION ??= `${process.env.COMMIT_REF?.slice(0, 7) ?? 'local'}-${Date.now().toString(36)}`
  const version = process.env.STZ_BUILD_VERSION

  return {
    name: 'stz-build-version',
    config: (_config, { command }) => ({
      define: {
        'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(command === 'build' ? version : null),
      },
    }),
    generateBundle() {
      // The client build only: its output is what the CDN serves at the site's root.
      if (this.environment?.name !== 'client') return
      this.emitFile({ type: 'asset', fileName: BUILD_VERSION_FILE, source: JSON.stringify({ version }) })
    },
  }
}
