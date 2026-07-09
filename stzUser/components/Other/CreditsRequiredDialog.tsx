import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Dialog, makeDialogRef } from '~stzUtils/components/Dialog'
import { AppleButtonGroup } from '~stzUtils/components/AppleButtonGroup'
import { WALLET_EVENTS } from '~stzUser/lib/wallet.client'

export function CreditsRequiredDialog() {
  const dialogRef = makeDialogRef()
  const navigate = useNavigate()

  useEffect(() => {
    const handleInsufficientCredits = () => {
      dialogRef.current?.setIsOpen(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(WALLET_EVENTS.INSUFFICIENT_CREDITS, handleInsufficientCredits)
      return () => {
        window.removeEventListener(WALLET_EVENTS.INSUFFICIENT_CREDITS, handleInsufficientCredits)
      }
    }
  }, [])

  return (
    <Dialog ref={dialogRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Credits Required</h3>
        <p style={{ margin: 0 }}>You don't have enough credits for this action.</p>
        <AppleButtonGroup
          alternativeButton={{
            label: 'Close',
            onClick: () => dialogRef.current?.setIsOpen(false),
          }}
          defaultButton={{
            label: 'Get More Credits',
            onClick: () => {
              navigate({ to: '/auth/credits' })
              dialogRef.current?.setIsOpen(false)
            },
          }}
        />
      </div>
    </Dialog>
  )
}
