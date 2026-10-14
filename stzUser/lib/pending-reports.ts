/**
 * Reports that must arrive even from a page about to go, or from a page too old to reach the
 * server: a report rides logToServer, itself a server function, which a deploy may have renamed.
 *
 * Each waits in sessionStorage until it is sent, and every page sends what is waiting when it
 * starts, see AppUpdate. A report sent from a page that is about to reload is queued, not sent,
 * and the new page sends it.
 *
 * See planning doc pd-3e5lmh, a page from before a deploy.
 */
import { logToServer } from './logToServer'

const QUEUE_KEY = 'stz.pendingReports'

export type PendingReport = { message: string; context: Record<string, unknown> }

function readQueue(): PendingReport[] {
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? '[]') as PendingReport[]
  } catch {
    return []
  }
}

function writeQueue(queue: PendingReport[]) {
  try {
    if (queue.length === 0) sessionStorage.removeItem(QUEUE_KEY)
    else sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // A report is best effort; a browser that refuses storage loses it.
  }
}

/** Keeps a report for the next page to send. For a page about to reload. */
export function queueReport(report: PendingReport) {
  writeQueue([...readQueue(), report])
}

/** Keeps a report and tries to send it now. */
export function sendReport(report: PendingReport) {
  queueReport(report)
  void sendPendingReports()
}

let sending = false

/** Sends what is waiting, oldest first; one that fails stays for the next page. */
export async function sendPendingReports() {
  if (sending) return
  sending = true
  try {
    for (let report = readQueue()[0]; report; report = readQueue()[0]) {
      try {
        await logToServer({ data: { level: 'error', message: report.message, context: report.context, notify: true } })
      } catch {
        return
      }
      writeQueue(readQueue().slice(1))
    }
  } finally {
    sending = false
  }
}
