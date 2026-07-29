import { Link, useNavigate } from '@tanstack/react-router'
import { signOut, useSession } from '~stzUser/lib/auth-client'
import { routeStrings } from "~/constants";
import { activeLinkStyle } from "~stzUtils/components/styles";
import { WalletWidget } from './WalletWidget'
import { Disclosure } from '~stzUtils/components/Disclosure'
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

/**
 * Collapse the signed-in block — email, credits, Profile, Sign Out — behind a user icon.
 *
 * Always on, and this const is the whole affordance for changing that. The header used to
 * wrap to two lines on an iPad Mini, and measuring said spacing was not the cause: removing
 * every pixel of it bought two characters of email address. The email is the unshrinkable
 * item, so the only fix that holds for any address is to stop rendering it in the header.
 *
 * If wide screens ever want the open layout back, make this a width test — nothing else
 * changes, because both layouts are rendered from the same pieces below.
 *
 * A user icon rather than a hamburger, deliberately: a hamburger conventionally holds
 * navigation, and here the navigation is what stays visible. Play and Analysis get used
 * constantly; Sign Out approximately never.
 */
const collapseUserBlock = true

// Matches HelpDisclosure's control, so the two round things in a header row are the
// same size. Also what the pending state reserves.
const userIconSize = '1.4rem'

/**
 * How the menu panel lays its items out. A column, because a 408px row cannot fit a
 * phone: right-anchored at an iPhone XS width it ran off the left edge and ate half
 * the email address. A column is also what a menu conventionally looks like.
 *
 * Kept as a switch because the row is a perfectly good desktop panel and Steve may
 * want it back there. Worth knowing before reaching for it: if desktop ever stops
 * collapsing at all, it gets the row in the header anyway, which may be the thing
 * actually wanted.
 */
const menuDirection: 'column' | 'row' = 'column'

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
    // The 260px reserve belongs to the open layout only. Collapsed, it would hold the
    // header exactly as wide as before and the menu would save nothing — the reserve
    // IS the width being reclaimed.
    minWidth: collapseUserBlock ? undefined : '260px',
    justifyContent: 'flex-end',
  } as const

  if (isPending) {
    return (
      <div style={containerStyle}>
        {collapseUserBlock ? (
          // Reserve exactly what is about to arrive, so the header cannot jump as the
          // session resolves. The open layout reserves a full-width bar for the same
          // reason; collapsed, the thing arriving is one icon.
          <span style={{ display: 'inline-block', width: userIconSize }} />
        ) : (
          <div style={{
            width: '100%',
            height: '24px',
            backgroundColor: 'var(--color-text)',
            borderRadius: '4px',
            opacity: 0.1
          }} />
        )}
      </div>
    )
  }

  // Signed out, everything the signed-in block holds is either meaningless or
  // invisible: the email is undefined, the wallet returns null, and Profile leads to
  // a page that can only offer you a sign-in form. What used to remain was an empty
  // <p> and its margin holding width open for nothing. So this is the whole block,
  // and it is never collapsed — hiding the one thing a signed-out visitor might want
  // behind an icon would be a poor trade for a link this narrow.
  if (!session?.user) {
    return (
      <div style={containerStyle}>
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
      </div>
    )
  }

  // How the signed-in pieces stack. In the header they are always a row — that is what
  // a header is. Only the menu gets a say, so this reads menuDirection through the
  // collapse switch rather than using it directly.
  const blockDirection = collapseUserBlock ? menuDirection : 'row'

  // Spacing that exists only to separate items along a row. In a column the panel's own
  // gap does that job, and a trailing margin would just make the panel wider than its
  // content — which is the width we are trying to keep down on a phone.
  const rowSpacing = blockDirection === 'row' ? '1rem' : 0

  // Rendered either straight into the header or into the menu panel, unchanged. That
  // is what keeps the open layout resurrectable: there is one copy of these pieces,
  // not a header version and a menu version drifting apart.
  const signedInBlock = (
          <>
            {/* Email and credits were a pair in the header — two readouts sitting apart
                from the links. In a menu that grouping has no meaning, and it cost width:
                the panel is as wide as its widest line, and this line was the widest. */}
            <div style={{
              display: 'flex',
              flexDirection: blockDirection,
              alignItems: blockDirection === 'column' ? 'flex-start' : 'center',
              gap: '0.75rem',
              marginRight: rowSpacing,
              fontSize: '0.9rem',
            }}>
              <p style={{
                fontWeight: '200',
                margin: 0,
                opacity: 0.8
              }}
              >
                {session.user.email}
              </p>
              <WalletWidget style={{
                whiteSpace: 'nowrap',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link
                style={{ ...navLinkStyle, marginRight: rowSpacing }}
                to={'/auth/profile'}
                activeProps={{
                  style: { ...navLinkStyle, ...activeLinkStyle, marginRight: rowSpacing }
                }}
              >
                Profile
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link
                onClick={handleSignOut}
                style={navLinkStyle}
                to={routeStrings.signin}
              >
                Sign Out
              </Link>
            </div>
          </>
  )

  if (!collapseUserBlock) {
    return <div style={containerStyle}>{signedInBlock}</div>
  }

  return (
    <div style={containerStyle}>
      <Disclosure
        summary={
          <i
            className="fa-solid fa-user"
            style={{
              color: 'var(--color-link)',
              width: userIconSize,
              display: 'inline-flex',
              justifyContent: 'center',
            }}
          />
        }
        title="Account"
        // No Close: picking something or clicking away already dismisses this, and a
        // button would be a fifth thing to read in a list of four.
        showClose={false}
        panelStyle={{
          // Anchored to the trailing edge, not the leading one. The control sits at the
          // right of the header, so a panel opening leftward from it would run off the
          // page — this is the one place Disclosure's left: 0 default is wrong.
          left: 'auto',
          right: 0,
          display: 'flex',
          flexDirection: blockDirection,
          alignItems: blockDirection === 'column' ? 'flex-start' : 'center',
          gap: '0.75rem',
          // A ceiling, so the panel cannot overflow at ANY width rather than at the
          // ones we happened to test. The play panel carries the same guard for the
          // mirror-image reason — it is pinned to left: 0, so a long item runs off the
          // right. This one is pinned right and ran off the left.
          maxWidth: '90vw',
          // An email address is one long unbreakable token, and the panel is narrow on
          // a phone. HelpDisclosure does exactly this, for exactly this case. Both
          // properties inherit, so the <p> inside is covered without touching it.
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid var(--color-bg-secondary)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        {signedInBlock}
      </Disclosure>
    </div>
  )
}
