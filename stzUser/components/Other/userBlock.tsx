import { Link, useNavigate } from '@tanstack/react-router'
import { signOut, useSession } from '~stzUser/lib/auth-client'
import { routeStrings } from "~/constants";
import { activeLinkStyle } from "~stzUtils/components/styles";
import { WalletWidget } from './WalletWidget'
import type { MouseEvent } from 'react'


/*
const loggedInTextTopMarginTweak = 21

export const adjustVerticalLocationStyle = (fineAdjustment = 0) => {
  // Decommissioned tweak - messes with the whole header alignment
  return {
    marginTop: `${loggedInTextTopMarginTweak + (fineAdjustment || 0)}px`,
    marginBottom: `${loggedInTextTopMarginTweak * 2}px`,
  }
}
*/

export const navLinkStyle = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--color-link)',
}

const signOutTimeoutMs = 10_000
const signOutFailureMessage = 'Sign-out could not be confirmed. Please try again.'

export function UserBlock() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()

  const handleSignOut = async (event: MouseEvent<HTMLAnchorElement>) => {
    // This remains a Link to preserve the long-settled shared-header layout, but
    // its navigation must not outrun the request that makes that destination true.
    event.preventDefault()

    try {
      const { error } = await signOut({
        fetchOptions: {
          timeout: signOutTimeoutMs,
        },
      })

      if (error) {
        console.error('Sign-out failed:', error)
        alert(signOutFailureMessage)
        return
      }

      navigate({ to: routeStrings.signin })
    } catch (error) {
      // Better Auth normally returns failures as { error }; retain this boundary
      // for an unexpected rejection, including an aborted or failed network request.
      console.error('Sign-out failed:', error)
      alert(signOutFailureMessage)
    }
  }

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: '260px',
    justifyContent: 'flex-end',
  } as const

  if (isPending) {
    return (
      <div style={containerStyle}>
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: 'var(--color-text)',
          borderRadius: '4px',
          opacity: 0.1
        }} />
      </div>
    )
  }

  return (
    <div
      style={containerStyle}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginRight: '1rem',
        fontSize: '0.9rem',
      }}>
        <p style={{
          fontWeight: '200',
          margin: 0,
          opacity: 0.8
        }}
        >
          {session?.user.email}
        </p>
        <WalletWidget style={{
          whiteSpace: 'nowrap',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link
          style={{ ...navLinkStyle, marginRight: '1rem' }}
          to={'/auth/profile'}
          activeProps={{
            style: { ...navLinkStyle, ...activeLinkStyle, marginRight: '1rem' }
          }}
        >
          Profile
        </Link>
      </div>
      {
        session?.user ?
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              onClick={handleSignOut}
              style={navLinkStyle}
              to={routeStrings.signin}
            >
              Sign Out
            </Link>
          </div>
          :
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              to={routeStrings.signin}
              style={navLinkStyle}
              activeProps={{
                style: { ...navLinkStyle, ...activeLinkStyle }
              }}
            >
              Sign In
            </Link>
          </div>
      }
    </div>
  )
}
