import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import NephraFace from '../components/NephraFace'
import ThemeToggle from '../components/ThemeToggle'
import { Aurora } from '../sections/Hero'
import { DEMO_PASSWORD, ROLES, ROLE_KEYS } from '../data/content'
import { useGo } from '../hooks/useGo'
import { useUIStore } from '../store/useUIStore'

const SUBTITLE = { resident: 'No account needed', doctor: 'YAKAP clinic', bhw: 'One barangay', cho: 'City-wide counts' }

// /login/:role. key={role} gives each role a fresh form, as switching roles did in the prototype.
export default function SignInRoute() {
  const { role } = useParams()
  if (!ROLES[role]) return <Navigate to="/" replace />
  return <SignIn key={role} role={role} />
}

function SignIn({ role }) {
  const go = useGo()
  const resident = role === 'resident'
  const first = useRef(null)
  useEffect(() => { first.current?.focus({ preventScroll: true }) }, [])

  return (
    <div className="auth">
      <Aurora />
      <div className="auth-top">
        <Link className="brand" to="/"><BrandMark />NEPHLUX</Link>
        <span className="flex gap-2">
          <button className="btn sm glass" onClick={() => go('home')}><Icon name="back" />Home</button>
          <ThemeToggle className="glass" />
        </span>
      </div>
      <div className="auth-card glass">
        <aside className="auth-side">
          <div className="eyebrow text-white/70">Access Portal</div>
          <h2>One pathway, four roles.</h2>
          <p>Residents check without an account. YAKAP doctors, barangay health workers and the City Health Office sign in to their own screens.</p>
          <div className="neph">
            <span className="mini"><NephraFace emotion="happy" size={54} /></span>
            <span>New here? Try a demo account, or watch the guided demo from the home page.</span>
          </div>
          <p className="fine">Prototype sign-in for demonstration only. It is not secure and is not connected to PhilHealth or to real patient records.</p>
        </aside>
        <div className="auth-form">
          <div className="eyebrow">Sign in</div>
          <h1>{ROLES[role].name}</h1>
          <div className="rolepick" role="group" aria-label="Role">
            {ROLE_KEYS.map((k) => (
              <button key={k} type="button" aria-pressed={k === role} onClick={() => go(`login:${k}`)}>
                <span className="ri"><Icon name={ROLES[k].icon} className="" /></span>
                <span>{ROLES[k].short || ROLES[k].name}<small>{SUBTITLE[k]}</small></span>
              </button>
            ))}
          </div>
          {resident ? <ResidentBody startRef={first} /> : <StaffForm role={role} firstRef={first} />}
        </div>
      </div>
    </div>
  )
}

function ResidentBody({ startRef }) {
  const go = useGo()
  return (
    <>
      <div className="note mt-3.5">
        <b>Residents don't need an account.</b> The awareness check keeps nothing: your answers stay on your screen and leave only as a short clinic code that you choose to show.
      </div>
      <button ref={startRef} className="btn primary mt-[18px] w-full" onClick={() => go('resident')}><Icon name="arrow" />Start the 2-minute check</button>
    </>
  )
}

function StaffForm({ role, firstRef }) {
  const go = useGo()
  const setSession = useUIStore((s) => s.setSession)
  const notify = useUIStore((s) => s.notify)
  const r = ROLES[role]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bad, setBad] = useState({ email: false, password: false })
  const [msg, setMsg] = useState('')

  function signIn() {
    setSession({ role, name: r.demoName })
    // TODO: open the role's home screen once the staff screens are ported
    notify(`Signed in as ${r.demoName}. The ${r.short || r.name} screens are not ported to React yet.`)
  }

  function onSubmit(e) {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    setBad({ email: !em, password: !password })
    if (!em || !password) return setMsg('Enter your work email and password.')
    if (em !== r.email || password !== DEMO_PASSWORD) return setMsg(`That is not the demo account. Use ${r.email} / ${DEMO_PASSWORD}.`)
    setMsg('')
    signIn()
  }

  function fillDemo() {
    setEmail(r.email)
    setPassword(DEMO_PASSWORD)
    setBad({ email: false, password: false })
    setMsg('')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setTimeout(signIn, reduce ? 0 : 250) // a beat so the filled-in fields are seen
  }

  return (
    <>
      <form noValidate onSubmit={onSubmit}>
        <label className="f" htmlFor="em">Work email</label>
        <input ref={firstRef} className={clsx('in', bad.email && 'bad')} id="em" type="email" autoComplete="off" placeholder={r.email}
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="f" htmlFor="pw">Password</label>
        <input className={clsx('in', bad.password && 'bad')} id="pw" type="password" autoComplete="off"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="muted text-[13px] min-h-5 mt-2" role="status">{msg}</p>
        <button className="btn primary w-full" type="submit">Sign in as {r.name}</button>
      </form>
      <div className="demo-acc">
        <div>
          <div className="font-semibold text-sm">Demo account</div>
          <div className="mono">{r.email} · {DEMO_PASSWORD}</div>
        </div>
        <button className="btn sm" type="button" onClick={fillDemo}>Use demo account</button>
      </div>
      <p className="muted text-[13px] mt-4">
        New staff? <a href="#" onClick={(e) => { e.preventDefault(); go('register') }}>Request access</a>
      </p>
    </>
  )
}
