import { useSyncExternalStore } from 'react'
import { Dialog } from '~stzUtils/components/Dialog'
import {
  acknowledgeUpdate,
  getUpdateNote,
  isUpdateCompletePending,
  subscribeToUpdateNote,
  watchForUpdates,
} from '~stzUser/lib/app-update'
import { sendPendingReports } from '~stzUser/lib/pending-reports'

// Subscribing is also when the watch starts: after hydration, in the browser only, and once,
// since the root renders this once. It is also when the reports an older page left are sent.
// See planning doc pd-3e5lmh.
const subscribe = (onChange: () => void) => {
  void sendPendingReports()
  const stopWatching = watchForUpdates()
  const unsubscribe = subscribeToUpdateNote(onChange)
  return () => {
    stopWatching()
    unsubscribe()
  }
}

/**
 * Rendered once at the root. Watches for a page from before a deploy, and after the reload says
 * "Update Complete" until the user taps OK — no quick message that leaves before it is read, Steve.
 * Nothing more, though a failed call began it: the update it called for has happened — Steve,
 * 2026-10-20.
 * The server renders nothing here: the note lives in her browser.
 */
export function AppUpdate() {
  const note = useSyncExternalStore(subscribe, getUpdateNote, () => null)

  return (
    <Dialog isOpen={isUpdateCompletePending(note)} onCancel={acknowledgeUpdate}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Update Complete</h3>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={acknowledgeUpdate}>OK</button>
        </div>
      </div>
    </Dialog>
  )
}
