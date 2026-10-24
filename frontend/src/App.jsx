import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Sprite from './components/Sprite'
import NephraFab from './components/NephraFab'
import NephraPanel from './components/NephraPanel'
import Toast from './components/Toast'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import Account from './pages/Account'
import { useGo } from './hooks/useGo'
import { useUIStore } from './store/useUIStore'

// the check and the staff screens bring Leaflet and the city data, so they load only when opened
const ResidentCheck = lazy(() => import('./pages/ResidentCheck'))
const StaffArea = lazy(() => import('./pages/staff/StaffArea'))

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
        <Route path="/account" element={<Account />} />
        <Route path="/doctor/*" element={<Suspense fallback={null}><StaffArea role="doctor" /></Suspense>} />
        <Route path="/cho/*" element={<Suspense fallback={null}><StaffArea role="cho" /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NephraFab />
      <NephraPanel />
      <Toast />
    </>
  )
}
