import {Link, useNavigate} from '@tanstack/react-router'
import {signOut, useSession} from '~/lib/auth-client'

const loggedInTextTopMarginTweak = 21

export const  adjustVerticalLocationStyle = {
  // Nasty tweaking to align to the vertical position and
  // bottom margin of the single Login button in a Form below.
  // Also used by _index.tsx.
  marginTop: `${loggedInTextTopMarginTweak}px`,
  marginBottom: `${loggedInTextTopMarginTweak * 2}px`,
}

export function UserBlock() {
  const navigate = useNavigate()
  const {data: session} = useSession()

  return (
    <div
      style={{
        display: 'flex',
        // justifyContent: 'center',
        margin: 'inherited 1.5rem',
        // margin: 'auto'
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
        <div>
          <Link
             onClick= {() => {
              signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({to: '/auth/signin'})
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
            to="/auth/signin"
          >
            Sign Out
          </Link>
        </div>
      </>
      :
      <>
        <p>&nbsp;</p>
        <div>
          <Link
            style={{
              ...adjustVerticalLocationStyle,
            }}
            to="/auth/signup"
          >
            Support
          </Link>
        </div>
      </>
      }
    </div>
  )
}
