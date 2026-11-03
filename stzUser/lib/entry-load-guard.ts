/**
 * The app's own update check lives in the bundle, so it can't help a page whose entry file is gone:
 * a tab restored from the browser's cache after a deploy asks for a `main-*.js` the deploy removed,
 * the import fails, and the page stays blank with nothing running to notice — Steve's stale tab,
 * 2026-11-03. So this one check travels in the page itself, as a plain inline script.
 *
 * It acts only until the app has started, since after that a failed import is a route chunk, which
 * app-update.ts handles without losing what's on the page. It cannot loop: it reloads at most once a
 * minute, and a note that cannot be written means no reload. The wordings are Chrome's and Firefox's
 * "dynamically imported module", and Safari's "Importing a module script failed".
 * See planning doc pd-3e5lmh, a page from before a deploy.
 */
export const APP_STARTED_FLAG = '__stzAppStarted';

const NOTE_KEY = 'stz.entryReload';
const RELOAD_AT_MOST_EVERY_MS = 60_000;

export const ENTRY_LOAD_GUARD = `(function (w) {
  w.addEventListener('unhandledrejection', function (event) {
    var message = String(event.reason && event.reason.message);
    if (w.${APP_STARTED_FLAG} || !/dynamically imported module|module script failed/i.test(message)) return;
    try {
      var last = Number(w.sessionStorage.getItem('${NOTE_KEY}'));
      if (last && Date.now() - last < ${RELOAD_AT_MOST_EVERY_MS}) return;
      w.sessionStorage.setItem('${NOTE_KEY}', String(Date.now()));
    } catch (e) {
      return;
    }
    w.location.reload();
  });
})(window);`;
