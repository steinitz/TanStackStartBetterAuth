import {createFileRoute, Link, useNavigate} from '@tanstack/react-router'

export const ContactSent = () => {
  const navigation = useNavigate()
  const {name, email}: {
    name?: string,
    email?: string,
  } = Route.useSearch()
  console.log({name, email})
  return (
    <main>
      <section>
        <form action="/">
          <h1>We've sent your message to our support team</h1>
          <p>Our support team will reply to the email you provided:</p>
          <p>{email}</p>

          <h3>Wrong Email Address?</h3>
          <Link
            to="/contact"
            search={{name, email}}
          >
            Rewrite your Message
          </Link>
          {/*<h3>Need more help?</h3><Link to="/contact">Contact Support</Link>*/}
          <div style={{textAlign: "right"}}>
            <button
              type="submit"
              onClick={() => navigation({to: '/'})}
            >
              Done
            </button>
          </div>
        </form>

      </section>
    </main>
  )
}

export const Route = createFileRoute('/contact-sent')({
  component: ContactSent,
})
