import { create } from 'zustand'

const THEME_KEY = 'nephlux_theme'
const SESSION_KEY = 'nephlux_v5_session'
let toastTimer

// a session from before the API (no token) or one past its expiry counts as signed out
function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return s?.token && s.expiresAt > Date.now() ? s : null
  } catch { return null }
}

// Screens the landing page links to but that are not ported to React yet.
// Replace navigate() with real routing as each screen arrives.
const PENDING = {
  resident: 'The resident check is not ported to React yet.',
  app: 'The staff screens are not ported to React yet.',
  demo: 'The guided demo is not ported to React yet.',
  evidence: 'The full evidence screen is not ported to React yet.',
}

export const useUIStore = create((set, get) => ({
  // index.html sets data-theme before first paint; start from it so there is no flash
  theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* storage blocked: theme lasts this visit */ }
    set({ theme })
  },

  portalOpen: false,
  setPortalOpen: (portalOpen) => set({ portalOpen }),

  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

  // staff sign-in from POST /auth/login: { role, name, token, expiresAt, user }, for this browser tab only
  session: loadSession(),
  setSession: (session) => {
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch { /* storage blocked: session lasts until reload */ }
    set({ session })
  },

  // the Nephra chat panel; its messages live in the panel and are never saved
  nephraOpen: false,
  setNephraOpen: (nephraOpen) => set({ nephraOpen }),

  benefitTab: 0,
  setBenefitTab: (benefitTab) => set({ benefitTab }),

  toast: { text: '', on: false },
  notify: (text) => {
    clearTimeout(toastTimer)
    set({ toast: { text, on: true } })
    toastTimer = setTimeout(() => set((s) => ({ toast: { ...s.toast, on: false } })), 3000)
  },

  // target is a screen key, optionally with a role: 'resident', 'login:doctor', 'demo', ...
  // routed screens go through useGo, which App hands to the store so components outside the router hooks can reach them
  routeTo: null,
  navigate: (target) => {
    const [screen] = target.split(':')
    if (screen === 'register' && get().routeTo) return get().routeTo(target)
    set({ portalOpen: false, mobileNavOpen: false })
    if (screen === 'nephra') return set({ nephraOpen: true })
    get().notify(PENDING[target.split(':')[0]] || 'This screen is not ported to React yet.')
  },
}))
