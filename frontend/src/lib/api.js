// Client for the NEPHLUX NestJS API (backend/). Every staff route needs the Bearer token from POST /auth/login;
// the resident check and the barangay list are public.
import { useUIStore } from '../store/useUIStore'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status // 0 = the server could not be reached
  }
}

// Nest sends { message: string | string[], statusCode }; validation errors come as a list
function messageOf(body, status) {
  const m = body?.message
  if (Array.isArray(m) && m.length) return m[0]
  if (typeof m === 'string' && m) return m
  return `The server answered ${status}.`
}

async function request(path, { method = 'GET', body, query, auth = false } = {}) {
  const url = new URL(API_URL + path)
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = useUIStore.getState().session?.token
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, "Can't reach the NEPHLUX server. Check your connection and try again.")
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    // an expired or revoked token signs the staff member out
    if (auth && res.status === 401) useUIStore.getState().setSession(null)
    throw new ApiError(res.status, messageOf(data, res.status))
  }
  return data
}

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    me: () => request('/auth/me', { auth: true }),
    updateMe: (body) => request('/auth/me', { method: 'PATCH', body, auth: true }),
    // a wrong current password comes back as 400, so it does not sign the staff member out
    changePassword: (currentPassword, newPassword) => request('/auth/me/password', { method: 'PATCH', body: { currentPassword, newPassword }, auth: true }),
  },
  // public: a doctor or CHO staff member asks for an account; the City Health Office approves it and emails them
  accessRequests: {
    create: (body) => request('/access-requests', { method: 'POST', body }),
  },
  barangays: {
    // boundaries add ~85 KB, so ask for them only for the map
    list: ({ search, includeBoundary } = {}) => request('/barangays', { query: { search, includeBoundary: includeBoundary ? 'true' : undefined } }),
    get: (id, { includeBoundary } = {}) => request(`/barangays/${id}`, { query: { includeBoundary: includeBoundary ? 'true' : undefined } }),
  },
  residentCheck: {
    questions: () => request('/resident-check/questions'),
    // answers are scored and returned; the API stores none of them
    check: (answers) => request('/resident-check', { method: 'POST', body: answers }),
    decode: (code) => request(`/resident-check/codes/${encodeURIComponent(code)}`, { auth: true }),
  },
  // DOCTOR (or ADMIN) only, scoped to the doctor's own clinic
  assessments: {
    create: (body) => request('/assessments', { method: 'POST', body, auth: true }),
    list: (query) => request('/assessments', { query, auth: true }),
    summary: () => request('/assessments/summary', { auth: true }),
    get: (id) => request(`/assessments/${id}`, { auth: true }),
  },
  referrals: {
    create: (body) => request('/referrals', { method: 'POST', body, auth: true }),
    list: (query) => request('/referrals', { query, auth: true }),
    get: (id) => request(`/referrals/${id}`, { auth: true }),
    slip: (id) => request(`/referrals/${id}/slip`, { auth: true }),
    markSlipPrinted: (id) => request(`/referrals/${id}/slip-printed`, { method: 'POST', auth: true }),
  },
  // DOCTOR (or BHW): results back from the lab; never edited, a wrong entry is followed by a repeat
  uacrResults: {
    create: (body) => request('/uacr-results', { method: 'POST', body, auth: true }),
    list: (assessmentId) => request('/uacr-results', { query: { assessmentId }, auth: true }),
  },
  // CHO only: counts by barangay, small cells come back as "<5"
  cityInsights: {
    overview: ({ period, sector } = {}) => request('/city-insights/overview', { query: { period, sector }, auth: true }),
    map: ({ period, sector } = {}) => request('/city-insights/map', { query: { period, sector }, auth: true }),
    budget: (tests) => request('/city-insights/budget', { query: { tests }, auth: true }),
    strategies: () => request('/city-insights/strategies', { auth: true }),
  },
}

// Lists are paged at most 100 rows a page; the follow-up screen needs every referral, so walk the pages.
// Stops after maxPages so a very large clinic cannot hang the screen; `total` tells the caller if it was cut short.
export async function allPages(list, query = {}, maxPages = 10) {
  const rows = []
  let total = 0
  for (let page = 1; page <= maxPages; page++) {
    const r = await list({ ...query, page, limit: 100 })
    rows.push(...r.data)
    total = r.meta.total
    if (rows.length >= total || !r.data.length) break
  }
  return { rows, total }
}

// The barangay list changes only with a reseed, so fetch it once per page load (with or without boundaries).
const cache = {}
export function barangayList({ includeBoundary = false } = {}) {
  const key = includeBoundary ? 'withBoundary' : 'plain'
  cache[key] ??= api.barangays.list({ includeBoundary }).catch((e) => { delete cache[key]; throw e })
  return cache[key]
}
