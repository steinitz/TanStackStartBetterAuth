import React from 'react'
import { ContactLink } from './Links'

export const Refunds = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Refund Policy</h1>

      <section style={{ marginTop: '2rem' }}>
        <h3>Credit Refunds</h3>
        <p>We offer a full refund within 14 days on any credit purchase, provided you have not used any of the credits. Once you spend credits on AI game analysis or any other service, the purchase becomes non-refundable.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Technical Issues</h3>
        <p>If you experience a major technical issue or platform failure that prevents you from utilizing your credits, please <ContactLink /> within 14 days of purchase for a full refund.</p>
      </section>
    </div>
  )
}
