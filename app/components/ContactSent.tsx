import {createFileRoute, Link, useNavigate} from '@tanstack/react-router'
import { Spacer } from '~/components/Spacer'

export const ContactSent = ({name, email, setMessageSent}) => {
  const navigate = useNavigate()
  console.log('ContactSent', {name, email, setMessageSent})
  return (
        <form>
          <h1>We've sent your message to our support team</h1>
          <p>Our support team will reply to the email you provided:</p>
          <p style={{marginLeft: '4rem'}}>{email}</p>
          <Spacer space={1} />
          <button
            type="reset"
            onClick={() => setMessageSent(false)}
          >
            Wrong Email Address?
          </button>
          <Spacer />
          <div style={{textAlign: "right"}}>
            <button
              type="submit"
              onClick={() => navigate({to: "/"})}
            >
              Done
            </button>
          </div>
        </form>
  )
}
