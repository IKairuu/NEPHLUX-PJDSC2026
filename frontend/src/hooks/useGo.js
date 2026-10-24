import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useUIStore } from '../store/useUIStore'
import { ROLES } from '../data/content'

// Screens that exist as routes. Anything else falls back to the store's "not ported yet" notice.
function pathFor(target) {
  if (target === 'home') return '/'
  if (target === 'resident') return '/resident/check'
  if (target === 'account') return '/account'
  if (target === 'demo') return '/demo'
  const [screen, role] = target.split(':')
  if (screen === 'login' && ROLES[role]) return `/login/${role}`
  if (screen === 'register') return `/register/${role || 'doctor'}`
  // the full evidence screen is a staff screen: open it for the signed-in role, else ask a doctor to sign in
  if (screen === 'evidence') {
    const signedIn = useUIStore.getState().session?.role
    return signedIn ? `/${signedIn}/evidence` : '/login/doctor'
  }
  return null
}

export function useGo() {
  const navigate = useNavigate()
  const pending = useUIStore((s) => s.navigate)
  return useCallback((target) => {
    const path = pathFor(target)
    if (!path) return pending(target)
    useUIStore.setState({ portalOpen: false, mobileNavOpen: false })
    navigate(path)
  }, [navigate, pending])
}
