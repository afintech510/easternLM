/**
 * Marketing engine API client
 * Proxies requests from the admin UI to the orchestrator.
 */

const MARKETING_API_URL = process.env.NEXT_PUBLIC_MARKETING_API_URL || 'http://localhost:3200'
const MARKETING_PASSWORD = process.env.MARKETING_ADMIN_PASSWORD || ''

interface FetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function marketingApi<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const res = await fetch(`${MARKETING_API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(MARKETING_PASSWORD ? { 'Authorization': `Bearer ${MARKETING_PASSWORD}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Marketing API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// Typed helpers
export const mktgGet = <T = unknown>(path: string) => marketingApi<T>(path)
export const mktgPost = <T = unknown>(path: string, body?: unknown) =>
  marketingApi<T>(path, { method: 'POST', body })
