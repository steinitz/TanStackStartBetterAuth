import React, { useEffect } from 'react'
import { Dialog, makeDialogRef } from '~stzUtils/components/Dialog'
import { WALLET_EVENTS } from '~stzUser/lib/wallet.client'

export function CreditsRequiredDialog() {
  const dialogRef = makeDialogRef()

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
        justifyContent: 'flex-end',
        marginTop: '20px',
        gap: '10px'
      }}>
        <button
          onClick={() => dialogRef.current?.setIsOpen(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-text)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
        <button
          onClick={() => {
            // Placeholder for top-up action
            console.log('Redirect to payment...')
            dialogRef.current?.setIsOpen(false)
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary, #007bff)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Get More Credits
        </button>
      </div>
    </Dialog>
  )
}
