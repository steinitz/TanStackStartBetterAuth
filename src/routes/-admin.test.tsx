import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: { component: React.ComponentType }) => ({
    options: config,
  }),
}))

vi.mock('~stzUser/components/RouteComponents/CreditsAdminPage', () => ({
  CreditsAdminPage: () => <h1>Shared credit administration</h1>,
}))

import { Route } from './admin'

describe('/admin application route', () => {
  it('is a thin adoption of the shared credit administration page', () => {
    const Component = Route.options.component as ComponentType
    render(<Component />)

    expect(screen.getByRole('heading', {
      name: 'Shared credit administration',
    })).toBeInTheDocument()
  })
})
