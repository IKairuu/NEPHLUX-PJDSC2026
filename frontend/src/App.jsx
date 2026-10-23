import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Sprite from './components/Sprite'
import NephraFab from './components/NephraFab'
import Toast from './components/Toast'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import { useGo } from './hooks/useGo'
import { useUIStore } from './store/useUIStore'

// the check brings Leaflet and the city data, so it loads only when opened
const ResidentCheck = lazy(() => import('./pages/ResidentCheck'))

// lets store.navigate('register') (Nav, MobileNav) use the router
function RouterBridge() {
  const go = useGo()
  useEffect(() => { useUIStore.setState({ routeTo: go }) }, [go])
  return null
}

// new page starts at the top; in-page #anchors keep their own scrolling
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <Sprite />
      <ScrollToTop />
      <RouterBridge />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/:role" element={<SignIn />} />
        <Route path="/resident/check" element={<Suspense fallback={null}><ResidentCheck /></Suspense>} />
        <Route path="/register" element={<Navigate to="/register/doctor" replace />} />
        <Route path="/register/:role" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NephraFab />
      <Toast />
    </>
  )
}
