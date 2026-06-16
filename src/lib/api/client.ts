const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api'

export const TokenStore = {
  get access()  { return localStorage.getItem('robles_access') },
  get refresh() { return localStorage.getItem('robles_refresh') },
  set(a: string, r?: string) {
    localStorage.setItem('robles_access', a)
    if (r) localStorage.setItem('robles_refresh', r)
  },
  clear() {
    ;['robles_access', 'robles_refresh'].forEach(k => localStorage.removeItem(k))
  },
}

async function refreshAccessToken(): Promise<string> {
  const rt = TokenStore.refresh
  if (!rt) throw new Error('No refresh token')
  const r = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
  if (!r.ok) throw new Error('Refresh failed')
  const d = await r.json()
  TokenStore.set(d.accessToken, d.refreshToken)
  return d.accessToken
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<unknown> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (TokenStore.access) headers['Authorization'] = `Bearer ${TokenStore.access}`

  let r = await fetch(url, { ...opts, headers })

  if (r.status === 401 && TokenStore.refresh) {
    try {
      const token = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${token}`
      r = await fetch(url, { ...opts, headers })
    } catch {
      TokenStore.clear()
      window.location.href = '/login'
      throw new Error('Sesión expirada')
    }
  }

  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
    throw new Error((e as { error?: string }).error ?? `Error ${r.status}`)
  }

  if (r.status === 204) return null
  return r.json()
}

async function apiUpload(path: string, formData: FormData): Promise<unknown> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {}
  if (TokenStore.access) headers['Authorization'] = `Bearer ${TokenStore.access}`
  const r = await fetch(url, { method: 'POST', headers, body: formData })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
    throw new Error((e as { error?: string }).error ?? `Error ${r.status}`)
  }
  return r.json()
}

type QueryParams = Record<string, string | number | boolean | undefined>

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return p ? `?${p}` : ''
}

export const api = {
  get:    (path: string, params?: QueryParams) => apiFetch(path + buildQuery(params), { method: 'GET' }),
  post:   (path: string, body: unknown)        => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    (path: string, body: unknown)        => apiFetch(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown)        => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string)                       => apiFetch(path, { method: 'DELETE' }),
  upload: (path: string, fd: FormData)         => apiUpload(path, fd),
}

export default api
