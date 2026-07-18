import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~stzUser/lib/auth-client', () => ({
  useSession: vi.fn(),
}))

vi.mock('~stzUser/lib/admin', () => ({
  getAdminStatus: vi.fn(),
}))

import { useSession } from '~stzUser/lib/auth-client'
import { getAdminStatus } from '~stzUser/lib/admin'
import { useAdminStatus } from '~stzUser/lib/admin-queries'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function wrapperFor(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('admin status query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: null } as any)
  })

  it('does not call the server or invent admin access while signed out', () => {
    const { result } = renderHook(() => useAdminStatus(), {
      wrapper: wrapperFor(createQueryClient()),
    })

    expect(getAdminStatus).not.toHaveBeenCalled()
    expect(result.current.data).toEqual({ isAdmin: false, source: 'none' })
  })

  it('returns only the signed-in user effective status', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'environment-admin' } },
    } as any)
    vi.mocked(getAdminStatus).mockResolvedValue({
      isAdmin: true,
      source: 'environment',
    })

    const { result } = renderHook(() => useAdminStatus(), {
      wrapper: wrapperFor(createQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      isAdmin: true,
      source: 'environment',
    })
    expect(getAdminStatus).toHaveBeenCalledOnce()
  })
})
