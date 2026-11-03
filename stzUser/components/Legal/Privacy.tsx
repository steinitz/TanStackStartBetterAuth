import React from 'react'
import { ContactLink } from './Links'

/** The app's own sections, such as what it shares with its AI provider, follow what's collected. */
export const Privacy = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Privacy Policy</h1>

      <section style={{ marginTop: '2rem' }}>
        <h3>What we collect</h3>
        <p>We only collect your email address and name when you sign up. This allows you to securely log in, save your games, and track your progress across different devices.</p>
      </section>

      {children}

      <section style={{ marginTop: '1.5rem' }}>
        <h3>No Selling</h3>
        <p>Your data belongs to you. We don't sell your personal information to third parties. We don't use it for advertising. It's only used to provide the services you requested.</p>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Your Rights</h3>
        <p>You have the right to access or delete your data at any time. You can use the "Delete Account" button in your profile, or <ContactLink /> if you need help cleaning things up.</p>
      </section>

      <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: 'gray' }}>
        Your trust is important to us.
      </p>
    </div>
  )
}
