import React from 'react'
import { RefundsLink } from './Links'

export const Terms = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Terms of Service</h1>

      <section style={{ marginTop: '2rem' }}>
        <h3>1. No Warranties</h3>
        <p>This is a tool provided "as is". If it misses a chess tactic, the engine makes a mistake, or the server goes down, we aren't liable. Use it as a guide, not gospel.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>2. Refunds</h3>
        <p>Please see our <RefundsLink label="Refund Policy" /> for the terms that apply to credit purchases.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>3. Credit Expiration</h3>
        <p>Credits generally do not expire as long as your account remains active. However, we reserve the right to expire credits if an account has been inactive (no logins or usage) for a continuous period of 12 months.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>4. Changes</h3>
        <p>We might update these rules as the project evolves. By continuing to use the site, you're agreeing to the updated terms.</p>
      </section>

      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: 'gray' }}>
        Thanks for being part of the community.
      </p>
    </div>
  )
}
