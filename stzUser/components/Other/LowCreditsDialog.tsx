import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Dialog } from '~stzUtils/components/Dialog'
import { AppleButtonGroup } from '~stzUtils/components/AppleButtonGroup'
import { useWallet } from '~stzUser/lib/wallet-queries'
import { clientEnv } from '~stzUser/lib/env'

/**
 * Says once, as it happens, that her balance has fallen below the app's warning line. The account
 * icon says so for as long as it lasts — see UserBlock's lowCreditsWarning — and this says it at
 * the moment it happens, where a changed icon alone might go unseen. Steve, 2026-09-30.
 *
 * Once per crossing: it opens when the balance goes from at or above the line to below it, and not
 * again until she has been back above. Arriving on a page already below the line opens nothing,
 * since that crossing happened earlier or on another visit, and so does a balance not yet read.
 *
 * Its buttons are the refusal dialog's, in its order: Close, then Get More Credits. The Credits
 * page is itself a second chance to leave, so this need not guard the door — Steve, 2026-09-30.
 */
export function LowCreditsDialog({ threshold }: { threshold: number }) {
  const { credits } = useWallet()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // The balance at the last render, in state, so the crossing is noticed during this render rather
  // than by an effect a render later: React's pattern for storing information from previous
  // renders. Setting state here re-renders at once, before anything is drawn.
  const [previousCredits, setPreviousCredits] = useState(credits)
  if (credits !== previousCredits) {
    setPreviousCredits(credits)
    if (previousCredits != null && credits != null && previousCredits >= threshold && credits < threshold) {
      setIsOpen(true)
    }
  }

  return (
    <Dialog isOpen={isOpen}>
      {/* A reading width. Its sentence is long, and without one the dialog stretched nearly edge
          to edge on an iPad — Steve, 2026-09-30. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
        <h3 style={{ margin: 0 }}>Running Low on Credits</h3>
        <p style={{ margin: 0 }}>
          You have {credits} {credits === 1 ? 'credit' : 'credits'} left. You get{' '}
          {clientEnv.DAILY_GRANT_CREDITS} free on your first visit each day, or you can buy more.
        </p>
        <AppleButtonGroup
          alternativeButton={{
            label: 'Close',
            onClick: () => setIsOpen(false),
          }}
          defaultButton={{
            label: 'Get More Credits',
            onClick: () => {
              setIsOpen(false)
              navigate({ to: '/auth/credits' })
            },
          }}
        />
      </div>
    </Dialog>
  )
}
