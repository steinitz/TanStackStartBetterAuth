import {Link, useNavigate} from '@tanstack/react-router'
import {signOut, useSession} from '~stzUser/lib/auth-client'
import {routeStrings} from "~/constants";
import {activeLinkStyle} from "~stzUtils/components/styles";

const loggedInTextTopMarginTweak = 21

export const adjustVerticalLocationStyle = (fineAdjustment=0) => {
  // Nasty tweaking to align to the vertical position and
  // bottom margin of the single Login button in a Form below.
  // Also used by _index.tsx.
  return {
    marginTop: `${loggedInTextTopMarginTweak + (fineAdjustment || 0)}px`,
    marginBottom: `${loggedInTextTopMarginTweak * 2}px`,
  }
}

export const navLinkStyle = {
  ...adjustVerticalLocationStyle(),
  marginRight: '21px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}

export function UserBlock() {
  const navigate = useNavigate()
  const {data: session} = useSession()

  return (
    <div
      style={{
        display: 'flex',
      }}
    >
      <p style={{
        ...adjustVerticalLocationStyle(1),
        marginRight: '5rem',
        fontWeight: '200',
        fontSize: '0.95rem',
      }}
      >
        {session?.user.email}
      </p>
      <div>
        <Link
          style={navLinkStyle}
          to={'/auth/profile'}
          activeProps={{
            style: activeLinkStyle
          }}
        >
          Profile
        </Link>
      </div>
      {
        session?.user ?
        <div>
          <Link
            onClick={() => {
              signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({to: routeStrings.signin})
                  },
                },
              })
            }}
            style={navLinkStyle}
            to={routeStrings.signin}
          >
            Sign Out
          </Link>
        </div>
        :
        // !isSignInRoute &&
        <div>
          <Link
            to={routeStrings.signin}
            style={navLinkStyle}
            activeProps={{
              style: activeLinkStyle
            }}
          >
            Sign In
          </Link>
        </div>
      }
    </div>
  )
}
