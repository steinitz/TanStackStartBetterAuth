import { describe, it, expect, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'

// Mocking TanStack Start and Auth
vi.mock('@tanstack/react-start', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useRouter: () => ({}),
  useRouterState: () => ({}),
  useLinkProps: () => ({}),
}))

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'test-user', email: 'test@example.com' } } }),
}))

vi.mock('~stzUser/lib/env', () => {
  const clientEnv = {
    APP_NAME: 'Test App',
    COMPANY_NAME: 'Test Company',
    COPYRIGHT_START_YEAR: '2020',
    SUPPORT_LINK_TEXT: 'Contact our Support Team',
    SUPPORT_LINK_URL: '/contact',
    REFUND_POLICY_URL: '/legal/refunds',
  }
  return {
    clientEnv,
    computeClientEnv: () => clientEnv,
  }
})

import { About } from '../../components/Legal/About'
import { Acknowledgements } from '../../components/Legal/Acknowledgements'
import { Refunds } from '../../components/Legal/Refunds'

describe('Legal Page Components', () => {
  it('should render About page', () => {
    const { getByText } = render(<About />)
    expect(getByText(/Our Mission/i)).toBeDefined()
    expect(getByText(/Test Company/i)).toBeDefined()
  })

  it('should render Acknowledgements page', () => {
    const { getByText, getAllByText } = render(<Acknowledgements />)
    expect(getByText(/Technology Stack/i)).toBeDefined()
    expect(getAllByText(/React/i).length).toBeGreaterThan(0)
  })

  it('credits the starter icon unless the app brings its own acknowledgements', () => {
    expect(render(<Acknowledgements />).queryByText(/Ecology icon/i)).not.toBeNull()
    cleanup()
    const { queryByText } = render(<Acknowledgements><p>Our own thanks</p></Acknowledgements>)
    expect(queryByText(/Our own thanks/i)).not.toBeNull()
    expect(queryByText(/Ecology icon/i)).toBeNull()
  })

  it('should render Refunds page', () => {
    const { getByText } = render(<Refunds />)
    expect(getByText(/Refund Policy/i)).toBeDefined()
    expect(getByText(/Credit Refunds/i)).toBeDefined()
  })
})
