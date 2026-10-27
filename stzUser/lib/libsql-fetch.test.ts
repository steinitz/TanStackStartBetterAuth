import { afterEach, describe, expect, it, vi } from 'vitest'
import { libsqlFetch, type LibsqlRequest } from './libsql-fetch'

// Shaped like the cross-fetch Request the libsql client builds for a pipeline call.
const pipelineRequest = (body: string): LibsqlRequest => ({
  url: 'https://example.turso.io/v2/pipeline',
  method: 'POST',
  headers: new Map([
    ['content-type', 'application/json'],
    ['authorization', 'Bearer token'],
  ]),
  arrayBuffer: async () => new TextEncoder().encode(body).buffer as ArrayBuffer,
})

describe('libsqlFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("passes the client's request to Node's fetch as its parts", async () => {
    const answer = new Response('{}')
    const nodeFetch = vi.fn(async () => answer)
    vi.stubGlobal('fetch', nodeFetch)

    const response = await libsqlFetch(pipelineRequest('{"requests":[]}'))

    expect(response).toBe(answer)
    const [url, init] = nodeFetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.turso.io/v2/pipeline')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'content-type': 'application/json', authorization: 'Bearer token' })
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"requests":[]}')
  })

  it('sends no body with a GET', async () => {
    const nodeFetch = vi.fn(async () => new Response(''))
    vi.stubGlobal('fetch', nodeFetch)

    await libsqlFetch({ ...pipelineRequest(''), method: 'GET' })

    const [, init] = nodeFetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.body).toBeUndefined()
  })
})
