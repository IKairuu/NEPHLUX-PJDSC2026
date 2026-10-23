import { Navigate, Route, Routes } from 'react-router'
import { useUIStore } from '../../store/useUIStore'
import StaffShell, { NAV } from './StaffShell'
import Evidence from './Evidence'
import Queue from './doctor/Queue'
import Assess from './doctor/Assess'
import Review from './doctor/Review'
import Decisions from './doctor/Decisions'
import Followup from './doctor/Followup'
import Overview from './cho/Overview'
import './staff.css'

const SCREENS = {
  doctor: { queue: Queue, assess: Assess, decisions: Decisions, followup: Followup, evidence: Evidence },
  cho: { overview: Overview, evidence: Evidence },
}

// /doctor/* and /cho/*. Needs a session for that role (an expired token clears the session, which lands here and redirects).
export default function StaffArea({ role }) {
  const session = useUIStore((s) => s.session)
  if (session?.role !== role) return <Navigate to={`/login/${role}`} replace />

  const home = NAV[role][0][0]
  const title = (key) => NAV[role].find((n) => n[0] === key)?.[1]
  const page = (key, El, label = title(key)) => <StaffShell role={role} title={label}><El /></StaffShell>

  return (
    <Routes>
      <Route index element={<Navigate to={home} replace />} />
      {Object.entries(SCREENS[role]).map(([key, El]) => <Route key={key} path={key} element={page(key, El)} />)}
      {role === 'doctor' && <Route path="assessments/:id" element={page('assess', Review, 'Risk review')} />}
      <Route path="*" element={<Navigate to={`/${role}/${home}`} replace />} />
    </Routes>
  )
}
