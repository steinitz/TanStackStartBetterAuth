import {createFileRoute, Link} from '@tanstack/react-router'


export const ContactSent = () => {
  return (
    <main>
      <section>
        <form action="/">
          <h1>We've sent your message to our support team</h1>
          <p>Our support team will reply to the email you provided: {'testing@stzdev.com'}</p>

          <h3>Wrong Email Address?</h3><Link to="/contact">Rewrite your Message</Link>
          <h3>Need more help?</h3><Link to="/contact">Contact Support</Link>
          <div style={{textAlign: "right"}}>
            <button
              type="submit"
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
