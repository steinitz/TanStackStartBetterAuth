import {Link, useNavigate, useRouterState} from '@tanstack/react-router'
import {signOut, useSession} from '~/lib/auth-client'
import {routeStrings} from "~/constants";

const loggedInTextTopMarginTweak = 21

export const adjustVerticalLocationStyle = {
  // Nasty tweaking to align to the vertical position and
  // bottom margin of the single Login button in a Form below.
  // Also used by _index.tsx.
  marginTop: `${loggedInTextTopMarginTweak}px`,
  marginBottom: `${loggedInTextTopMarginTweak * 2}px`,
}

export function UserBlock() {
  const navigate = useNavigate()
  const {data: session} = useSession()
  const router = useRouterState()

  const isSignInRoute = router.location.pathname === routeStrings.signin

  return (
    <div
      style={{
        display: 'flex',
       }}
    >
      {session?.user ? <>
          <p>
            {session?.user.email}
          </p>
          <div>
            <Link
              style={{
                ...adjustVerticalLocationStyle,
                marginRight: '21px',
              }}
              to="/profile"
            >
              Profile
            </Link>
          </div>
          <p>&nbsp;</p>

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
              style={{
                ...adjustVerticalLocationStyle,
                marginRight: '21px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              to={routeStrings.signin}
            >
              Sign Out
            </Link>
          </div>
        </> :
        !isSignInRoute &&
        <Link
          style={{
            ...adjustVerticalLocationStyle,
            marginRight: '21px',
          }}
          to={routeStrings.signin}
        >
          Sign In
        </Link>
      }
     </div>
  )
}
