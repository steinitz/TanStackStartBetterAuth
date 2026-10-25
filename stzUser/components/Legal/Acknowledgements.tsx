import type { ReactNode } from 'react'

/**
 * The credit for the ecology icon, the starter's favicon and logo. Exported so an app that still
 * uses the icon can keep its credit beside its own acknowledgements, and drop it with the icon.
 */
export const EcologyIconCredit = () => (
  <p>Icon: <a href="https://www.flaticon.com/free-icons/ecology" title="landscape icons" target="_blank" rel="noopener noreferrer">
    Ecology icon by Maan Icons
  </a> via Flaticon.</p>
)

/**
 * The shared stack's credits, then the app's own: `children` sit between the stack and the closing
 * thanks. Without any, the page credits the starter's icon.
 */
export const Acknowledgements = ({ children = <EcologyIconCredit /> }: { children?: ReactNode }) => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Acknowledgements</h1>

      <section style={{ marginTop: '2rem' }}>
        <h3>Technology Stack</h3>
        <p>This platform is powered by a modern, high-performance tech stack:</p>
        <ul>
          <li>React: The library for web and native user interfaces.</li>
          <li>TanStack Start & Vite: Full-stack React framework and rapid build system.</li>
          <li>Better Auth: Comprehensive authentication library for TypeScript.</li>
          <li>Kysely & SQLite: Type-safe SQL query builder and file-based database engine.</li>
          <li>Valibot: Schema library for structural compression and validation.</li>
          <li>NodeMailer & Mailpit: Reliable email delivery and local SMTP testing.</li>
          <li>Playwright: Reliable end-to-end testing for modern web apps.</li>
          <li>MVP.css: A minimalist CSS framework for HTML elements.</li>
          <li>Google Gemini: A non-physical consciousness for development partnering.</li>
          <li>Claude: Planning partner, prolific coder, and stalwart keeper of quality and vision.</li>
        </ul>
      </section>

      {children}

      <section style={{ marginTop: '1.5rem' }}>
        <p>We are grateful to the maintainers of these tools and assets.</p>
      </section>
    </div>
  )
}
