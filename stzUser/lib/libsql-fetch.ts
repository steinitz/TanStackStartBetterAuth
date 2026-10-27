/**
 * Node's own fetch, for the libsql client's HTTP requests to Turso. See `libsqlClient` in
 * database.ts.
 *
 * Left to itself the client fetches through cross-fetch, which in Node is node-fetch 2, and that
 * keeps an idle connection open with no limit. On Netlify a function sleeps between calls, so
 * Turso can close a connection while the function cannot notice, and the next call that reuses
 * it fails with "socket hang up". Seen in ChessHurdles' production 2026-10-27: a coach comment
 * lost, its call a minute after the function's last. Node's own fetch drops a connection after
 * a few seconds idle, and heeds the server's keep-alive hint.
 *
 * The client hands over a cross-fetch Request, which Node's fetch cannot take as its input, so
 * the request is passed on as its parts.
 */
export async function libsqlFetch(request: LibsqlRequest): Promise<Response> {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  return fetch(request.url, {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: hasBody ? await request.arrayBuffer() : undefined,
  })
}

/** The parts of a cross-fetch Request that libsqlFetch reads. */
export interface LibsqlRequest {
  url: string
  method: string
  headers: { entries(): IterableIterator<[string, string]> }
  arrayBuffer(): Promise<ArrayBuffer>
}
