import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Sprite from './components/Sprite'
import NephraFab from './components/NephraFab'
import Toast from './components/Toast'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'

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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/resident" element={<SignIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NephraFab />
      <Toast />
    </>
  )
}
