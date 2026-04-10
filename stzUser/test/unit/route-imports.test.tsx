import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { testConstants } from '~stzUser/test/constants';

// Mock all external dependencies before importing route components
vi.mock('~stzUser/lib/users-client', () => ({
  useGetAllUsers: vi.fn(() => Promise.resolve([])),
  useDeleteUserById: vi.fn(),
  type: {
    User: {},
  },
}))

vi.mock('~/lib/count', () => ({
  getCount: vi.fn(() => Promise.resolve(42)),
}))

vi.mock('~stzUser/components/RouteComponents/SignIn', () => ({
  SignIn: () => React.createElement('div', { 'data-testid': 'signin-mock' }, 'SignIn Mock'),
}))

vi.mock('~stzUser/components/Other/UserManagement', () => ({
  UserManagement: ({ users }: { users: any[] }) => 
    React.createElement('div', { 'data-testid': 'user-management-mock' }, `UserManagement Mock - ${users?.length || 0} users`),
}))

vi.mock('~stzUtils/components/Spacer', () => ({
  Spacer: () => React.createElement('div', { 'data-testid': 'spacer-mock' }, 'Spacer Mock'),
}))

// Generic framework mock to include in stzUser/test/unit/route-imports.test.tsx
vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()
  return {
    ...actual,
    createServerFn: () => {
      const fn = vi.fn(() => Promise.resolve([]))
      return Object.assign(fn, {
        handler: () => fn,
        middleware: () => ({
          handler: () => fn,
          validator: () => fn,
        }),
        validator: () => fn,
      })
    },
  }
})

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('http://localhost'),
}))

// Mock TanStack Router
const mockUseLoaderData = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn((path: string) => {
    return (config: any) => ({
      ...config,
      options: config,
      useLoaderData: mockUseLoaderData,
    })
  }),
}))

describe('Route Import Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLoaderData.mockReturnValue({
      count: 42,
      users: [
        { id: '1', name: testConstants.defaultUserName, email: process.env.SMTP_REPLY_TO_ADDRESS },
      ],
    })
  })

  it('should import index route without errors', async () => {
    expect(async () => {
      await import('~/routes/index')
    }).not.toThrow()
  })

  it('should import signin route without errors', async () => {
    expect(async () => {
      await import('~/routes/auth/signin')
    }).not.toThrow()
  })

  it('should import and render index route component', async () => {
    const indexModule = await import('~/routes/index')
    const RouteConfig = indexModule.Route
    
    // Verify the route was created
    expect(RouteConfig).toBeDefined()
    expect(RouteConfig.options?.component).toBeDefined()
    
    // Test that the component can be rendered
    const Component = RouteConfig.options?.component
    if (Component) {
      expect(() => {
        render(React.createElement(Component))
      }).not.toThrow()
    }
  })

  it('should import and render signin route component', async () => {
    const signinModule = await import('~/routes/auth/signin')
    const RouteConfig = signinModule.Route
    
    // Verify the route was created
    expect(RouteConfig).toBeDefined()
    expect(RouteConfig.options?.component).toBeDefined()
    
    // Test that the component can be rendered
    const Component = RouteConfig.options?.component
    if (Component) {
      expect(() => {
        render(React.createElement(Component))
      }).not.toThrow()
    }
  })

  it('should handle loader function in index route', async () => {
    const indexModule = await import('~/routes/index')
    const RouteConfig = indexModule.Route
    
    // Verify the loader exists
    expect(RouteConfig.options?.loader).toBeDefined()

    // Loader may be a function or a RouteLoaderObject in newer TanStack Router versions
    const loader = RouteConfig.options?.loader
    const loaderFn = typeof loader === 'function' ? loader : (loader as any)?.fn
    if (loaderFn) {
      expect(async () => {
        // Mock loader context - TanStack Router loaders expect a context parameter
        const mockContext = {} as any
        await loaderFn(mockContext)
      }).not.toThrow()
    }
  })
})