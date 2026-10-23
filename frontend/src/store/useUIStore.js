import { create } from 'zustand'

const THEME_KEY = 'nephlux_theme'
const SESSION_KEY = 'nephlux_v5_session'
let toastTimer

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}

// Screens the landing page links to but that are not ported to React yet.
// Replace navigate() with real routing as each screen arrives.
const PENDING = {
  resident: 'The resident check is not ported to React yet.',
  app: 'The staff screens are not ported to React yet.',
  register: 'Staff registration is not ported to React yet.',
  demo: 'The guided demo is not ported to React yet.',
  nephra: 'The Nephra chat panel is not ported to React yet.',
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

  // demo sign-in: { role, name } for this browser tab only
  session: loadSession(),
  setSession: (session) => {
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch { /* storage blocked: session lasts until reload */ }
    set({ session })
  },

  benefitTab: 0,
  setBenefitTab: (benefitTab) => set({ benefitTab }),

  toast: { text: '', on: false },
  notify: (text) => {
    clearTimeout(toastTimer)
    set({ toast: { text, on: true } })
    toastTimer = setTimeout(() => set((s) => ({ toast: { ...s.toast, on: false } })), 3000)
  },

  // target is a screen key, optionally with a role: 'resident', 'login:doctor', 'demo', ...
  navigate: (target) => {
    set({ portalOpen: false, mobileNavOpen: false })
    get().notify(PENDING[target.split(':')[0]] || 'This screen is not ported to React yet.')
  },
}))
