import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import NephraFace from '../components/NephraFace'
import ThemeToggle from '../components/ThemeToggle'
import { Aurora } from '../sections/Hero'
import { ROLES, ROLE_KEYS } from '../data/content'
import { useGo } from '../hooks/useGo'
import { api } from '../lib/api'
import { useUIStore } from '../store/useUIStore'

// backend StaffRole -> the frontend's role keys (ADMIN may sign in through any staff card).
// The backend still has BHW accounts, but v6 has no BHW screens, so they are turned away below.
const ROLE_OF = { DOCTOR: 'doctor', CHO: 'cho' }
const EXPIRES_MS = { h: 3600e3, m: 60e3, s: 1e3, d: 864e5 }
const toMs = (s) => { const m = /^(\d+)([smhd])$/.exec(s || ''); return m ? +m[1] * EXPIRES_MS[m[2]] : 8 * 3600e3 }

const SUBTITLE = { resident: 'No account needed', doctor: 'YAKAP clinic', cho: 'City-wide counts' }

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
        <Link className="brand" to="/"><BrandMark /></Link>
        <span className="flex gap-2">
          <button className="btn sm glass" onClick={() => go('home')}><Icon name="back" />Home</button>
          <ThemeToggle className="glass" />
        </span>
      </div>
      <div className="auth-card glass">
        <aside className="auth-side">
          <div className="eyebrow text-white/70">Access Portal</div>
          <h2>One pathway, three roles.</h2>
          <p>Residents check without an account. YAKAP doctors and the City Health Office sign in to their own screens.</p>
          <div className="neph">
            <span className="mini"><NephraFace emotion="happy" size={54} /></span>
            <span>New here? Watch the guided demo from the home page.</span>
          </div>
          <p className="fine">Staff accounts are issued by the City Health Office. NEPHLUX is not connected to PhilHealth systems.</p>
        </aside>
        <div className="auth-form">
          <div className="eyebrow">Sign in</div>
          <h1>{ROLES[role].name}</h1>
          <div className="rolepick three" role="group" aria-label="Role">
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
  const navigate = useNavigate()
  const setSession = useUIStore((s) => s.setSession)
  const notify = useUIStore((s) => s.notify)
  const r = ROLES[role]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bad, setBad] = useState({ email: false, password: false })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(em, pw) {
    setBusy(true)
    setMsg('')
    try {
      const res = await api.auth.login(em, pw)
      const theirRole = ROLE_OF[res.user.role]
      if (res.user.role !== 'ADMIN' && theirRole !== role) {
        setBad({ email: true, password: false })
        return setMsg(theirRole
          ? `This is a ${ROLES[theirRole].name} account. Choose that role above to sign in.`
          : 'This account has no screen in this version. Sign in with a YAKAP doctor or City Health Office account.')
      }
      setSession({ role, name: res.user.fullName, token: res.accessToken, expiresAt: Date.now() + toMs(res.expiresIn), user: res.user })
      notify(`Signed in as ${res.user.fullName}`)
      navigate(`/${role}`)
    } catch (e) {
      setBad({ email: e.status === 401, password: e.status === 401 })
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    setBad({ email: !em, password: !password })
    if (!em || !password) return setMsg('Enter your work email and password.')
    signIn(em, password)
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
        <button className="btn primary w-full" type="submit" disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${r.name}`}</button>
      </form>
      <p className="muted text-[13px] mt-4">
        New staff? <a href="#" className="underline" onClick={(e) => { e.preventDefault(); go('register') }}>Request access</a>
      </p>
    </>
  )
}
