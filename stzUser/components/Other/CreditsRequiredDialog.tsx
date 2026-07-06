import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Dialog, makeDialogRef } from '~stzUtils/components/Dialog'
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
      <h3 style={{ marginTop: 0 }}>Credits Required</h3>
      <p>You don't have enough credits for this action.</p>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
        gap: '10px'
      }}>
        <button
          type="reset"
          onClick={() => dialogRef.current?.setIsOpen(false)}
        >
          Close
        </button>
        <button
          onClick={() => {
            navigate({ to: '/auth/credits' })
            dialogRef.current?.setIsOpen(false)
          }}
        >
          Get More Credits
        </button>
      </div>
    </Dialog>
  )
}
