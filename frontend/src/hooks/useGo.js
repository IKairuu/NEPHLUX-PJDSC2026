import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useUIStore } from '../store/useUIStore'

// Screens that exist as routes. Anything else falls back to the store's "not ported yet" notice.
const ROUTES = {
  home: '/',
  'login:resident': '/login/resident',
}

export function useGo() {
  const navigate = useNavigate()
  const pending = useUIStore((s) => s.navigate)
  return useCallback((target) => {
    const path = ROUTES[target]
    if (!path) return pending(target)
    useUIStore.setState({ portalOpen: false, mobileNavOpen: false })
    navigate(path)
  }, [navigate, pending])
}
