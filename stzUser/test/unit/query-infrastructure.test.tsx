import { QueryClient, useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createRouter } from '~/router'
import { renderWithProviders } from './test-utils'

beforeAll(() => {
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  })
})

describe('Query infrastructure', () => {
  it('creates an isolated QueryClient for every router instance', () => {
    const firstRouter = createRouter()
    const secondRouter = createRouter()
    const firstClient = firstRouter.options.context.queryClient
    const secondClient = secondRouter.options.context.queryClient

    expect(firstClient).toBeInstanceOf(QueryClient)
    expect(secondClient).toBeInstanceOf(QueryClient)
    expect(firstClient).not.toBe(secondClient)
    expect(firstRouter.options.Wrap).toBeTypeOf('function')
    expect(secondRouter.options.Wrap).toBeTypeOf('function')
  })

  it('provides a fresh QueryClient to unit-test consumers', async () => {
    function QueryConsumer() {
      const query = useQuery({
        queryKey: ['query-infrastructure-test'],
        queryFn: async () => 'query ready',
      })

      return <p>{query.data ?? 'query pending'}</p>
    }

    const first = await renderWithProviders(QueryConsumer, { pathPattern: '/query-test' })
    expect(await screen.findByText('query ready')).toBeInTheDocument()
    first.renderResult.unmount()

    const second = await renderWithProviders(QueryConsumer, { pathPattern: '/query-test' })
    expect(second.queryClient).not.toBe(first.queryClient)
  })
})
