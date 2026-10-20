/**
 * Brings a page from before a deploy up to date, by reloading it for her.
 *
 * A page keeps the code it was loaded with, while a deploy replaces the server's, so an old page's
 * calls may fail. Three things find out: the tab waking, a server call failing, and a route chunk
 * failing to load. Each asks `updateIfStale`, which compares the build this page runs with the one
 * the server names in `/version.json` — see build-version.ts — and reloads only when they differ.
 * She sees "Updating ChessHurdles…", the app's name, while it reloads, then "Update Complete"
 * until she taps OK: positive, and nothing more — Steve, 2026-10-20, replacing 2026-10-14's
 * "Error: Update required", which was too small and quick to read and, after the reload, confusing.
 *
 * It cannot loop. It reloads only into a build the page does not run, and the note it keeps in
 * sessionStorage forbids reloading into the same build twice — so a browser that served the old
 * page again would stay put rather than spin. A note that cannot be written means no reload.
 *
 * See planning doc pd-3e5lmh, a page from before a deploy.
 */
import { BUILD_VERSION_FILE } from './build-version'
import { clientEnv } from './env'
import { queueReport, type PendingReport } from './pending-reports'

const NOTE_KEY = 'stz.appUpdate'

/** What survives the reload. */
export type UpdateNote = {
  /** The build the page reloaded into. */
  build: string
  reloadedAt: number
  /** True when a failed call or a missing chunk found the page stale, rather than a waking tab. */
  failed: boolean
  /** True once she has tapped OK. The note is kept, so this build is never reloaded into twice. */
  acknowledged: boolean
}

/** The build this page runs; null on the dev server, which turns the whole check off. */
export const runningBuild = (): string | null => import.meta.env.VITE_BUILD_VERSION ?? null

/** Reload only into a build the page does not run, and never twice into the same one. */
export function shouldReload(running: string | null, served: string | null, note: UpdateNote | null) {
  return running !== null && served !== null && served !== running && note?.build !== served
}

/** The reload just happened and she has not yet said OK. */
export function isUpdateCompletePending(note: UpdateNote | null) {
  return note !== null && !note.acknowledged && note.build === runningBuild()
}

// The note, read once and then kept here, so useSyncExternalStore sees one object until it changes.
let note: UpdateNote | null | undefined
const listeners = new Set<() => void>()

export function getUpdateNote(): UpdateNote | null {
  if (note === undefined) {
    try {
      const stored = sessionStorage.getItem(NOTE_KEY)
      note = stored ? (JSON.parse(stored) as UpdateNote) : null
    } catch {
      note = null
    }
  }
  return note
}

/** False when the browser refused it, and then nothing may reload. */
function setUpdateNote(next: UpdateNote): boolean {
  try {
    sessionStorage.setItem(NOTE_KEY, JSON.stringify(next))
  } catch {
    return false
  }
  note = next
  listeners.forEach((listener) => listener())
  return true
}

/** Told whenever the note changes: when it is written before a reload, and when she taps OK. */
export function subscribeToUpdateNote(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function acknowledgeUpdate() {
  const current = getUpdateNote()
  if (current) setUpdateNote({ ...current, acknowledged: true })
}

async function fetchServedBuild(): Promise<string | null> {
  try {
    const response = await fetch(`/${BUILD_VERSION_FILE}`, { cache: 'no-store' })
    if (!response.ok) return null
    const { version } = await response.json()
    return typeof version === 'string' ? version : null
  } catch {
    // Offline, most likely. Unknown is not stale.
    return null
  }
}

/** Whether the server now serves another build; null when either is unknown. */
export async function isPageStale(): Promise<boolean | null> {
  const running = runningBuild()
  if (running === null) return null
  const served = await fetchServedBuild()
  return served === null ? null : served !== running
}

/**
 * A reload this page has begun. Several calls fail at once when a page goes stale, the home page's
 * two for one, and each asks: the first reloads, and the rest are told it is under way, rather
 * than "no", which read as a page that could not reload — found on the stale-test alias,
 * 2026-10-20, as a false `app.update.refusedNoReload`.
 */
let reloading = false

/**
 * Reloads the page when the server names a newer build. True when the reload is under way, begun
 * by this call or an earlier one.
 *
 * A report, when given, is sent by the new page: Steve is emailed once per page per build, since
 * this reloads into a build once. Sent from here it might not arrive, from a page that is going.
 */
export async function updateIfStale(
  { failed, report }: { failed: boolean; report?: PendingReport },
): Promise<boolean> {
  const running = runningBuild()
  if (running === null) return false
  if (reloading) return true
  const served = await fetchServedBuild()
  // Another call may have begun the reload while this one waited for the build.
  if (reloading) return true
  if (!shouldReload(running, served, getUpdateNote()) || served === null) return false
  if (!setUpdateNote({ build: served, reloadedAt: Date.now(), failed, acknowledged: false })) return false
  if (report) {
    queueReport({ ...report, context: { ...report.context, runningBuild: running, servedBuild: served, path: location.pathname } })
  }

  reloading = true
  showUpdatingDialog()
  // A task later, so whatever the app does on the failure, keeping a game it could not save, say,
  // finishes in the microtasks before the page goes.
  setTimeout(() => location.reload(), 0)
  return true
}

/**
 * Plain DOM, not React: it may be raised from a server call's middleware, outside any component.
 * Native and modal, so it sits in the top layer above every dialog the app has open.
 */
function showUpdatingDialog() {
  const dialog = document.createElement('dialog')
  // The theme's colours: a native dialog's own are white, whatever the theme. Large, so the moment
  // it shows is enough to read it.
  Object.assign(dialog.style, {
    padding: '1.5rem 2rem',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-text)',
    fontSize: '1.5rem',
  })
  dialog.textContent = `Updating ${clientEnv.APP_NAME}…`
  // Escape would only uncover a page that is about to go.
  dialog.addEventListener('cancel', (event) => event.preventDefault())
  document.body.append(dialog)
  dialog.showModal()
}

/** Watches for the two signs a page may be stale that are not server calls. Returns the cleanup. */
export function watchForUpdates() {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void updateIfStale({ failed: false })
  }
  // Vite raises this when a route's chunk will not load, which is what a deploy does to an old page.
  const onPreloadError = () => {
    void updateIfStale({ failed: true, report: { message: 'app.update.staleChunk', context: {} } })
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('vite:preloadError', onPreloadError)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('vite:preloadError', onPreloadError)
  }
}
