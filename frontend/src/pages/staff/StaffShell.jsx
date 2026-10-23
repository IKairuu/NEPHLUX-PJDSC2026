import { useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import Icon, { BrandMark } from '../../components/Icon'
import ThemeToggle from '../../components/ThemeToggle'
import { ROLES } from '../../data/content'
import { useUIStore } from '../../store/useUIStore'

export const NAV = {
  doctor: [['queue', 'Patient queue', 'list'], ['assess', 'New assessment', 'flask'], ['decisions', 'Decisions', 'check'], ['followup', 'Follow-up', 'clock'], ['evidence', 'Evidence', 'book']],
  cho: [['overview', 'Overview', 'chart'], ['evidence', 'Evidence', 'book']],
}

function initialsOf(name) {
  return name.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// Signed-in staff layout: side navigation on wide screens, a bottom tab bar on phones
export default function StaffShell({ role, title, children }) {
  const navigate = useNavigate()
  const session = useUIStore((s) => s.session)
  const setSession = useUIStore((s) => s.setSession)
  const notify = useUIStore((s) => s.notify)
  const r = ROLES[role], nav = NAV[role]
  const name = session?.name || r.name

  useEffect(() => {
    document.body.classList.add('in-app')
    return () => document.body.classList.remove('in-app')
  }, [])

  function signOut() {
    setSession(null)
    navigate('/')
    notify('Signed out')
  }

  const link = ([key, label, icon]) => (
    <NavLink key={key} to={`/${role}/${key}`} className={({ isActive }) => (isActive ? 'on' : undefined)}>
      <Icon name={icon} className="" />{label}
    </NavLink>
  )

  return (
    <div className="app">
      <aside className="side" aria-label="Main navigation">
        <Link className="brand" to="/"><BrandMark />NEPHLUX</Link>
        <div className="who">
          <span className="av">{initialsOf(name)}</span>
          <span><b>{name}</b><small>{r.name}</small></span>
        </div>
        <nav className="snav" aria-label={`${r.name} screens`}>{nav.map(link)}</nav>
        <div className="spacer" />
        <div className="snav">
          <Link to="/account"><Icon name="res" className="" />Account</Link>
          <button onClick={signOut}><Icon name="out" className="" />Sign out</button>
        </div>
        <div className="sfoot">Signed in through the NEPHLUX API · screening support, not a diagnosis</div>
      </aside>
      <div className="min-w-0">
        <div className="top">
          <span className="crumb"><span className="max-sm:hidden">{r.name}</span><span className="max-sm:hidden" aria-hidden="true">/</span><b>{title}</b></span>
          <span className="rolechip"><Icon name={r.icon} />{r.short || r.name}</span>
          <ThemeToggle />
        </div>
        <main className="main" id="main" tabIndex={-1}>{children}</main>
      </div>
      <nav className="tabbar" aria-label="Screens">
        {nav.map(link)}
        <button onClick={signOut}><Icon name="out" className="" />Sign out</button>
      </nav>
    </div>
  )
}
