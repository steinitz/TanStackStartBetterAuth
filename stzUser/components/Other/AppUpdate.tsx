import { useSyncExternalStore } from 'react'
import { Dialog } from '~stzUtils/components/Dialog'
import {
  acknowledgeUpdate,
  getUpdateNote,
  isUpdateCompletePending,
  subscribeToUpdateNote,
  UPDATE_REQUIRED,
  watchForUpdates,
} from '~stzUser/lib/app-update'

// Subscribing is also when the watch starts: after hydration, in the browser only, and once,
// since the root renders this once. See planning doc pd-3e5lmh.
const subscribe = (onChange: () => void) => {
  const stopWatching = watchForUpdates()
  const unsubscribe = subscribeToUpdateNote(onChange)
  return () => {
    stopWatching()
    unsubscribe()
  }
}

/**
 * Rendered once at the root. Watches for a page from before a deploy, and after the reload says
 * "Update Complete" until she taps OK — no quick message that leaves before it is read, Steve.
 * The server renders nothing here: the note lives in her browser.
 */
export function AppUpdate() {
  const note = useSyncExternalStore(subscribe, getUpdateNote, () => null)

  return (
    <Dialog isOpen={isUpdateCompletePending(note)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Update Complete</h3>
        {note?.failed && <p style={{ margin: 0 }}>{UPDATE_REQUIRED}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={acknowledgeUpdate}>OK</button>
        </div>
      </div>
    </Dialog>
  )
}
