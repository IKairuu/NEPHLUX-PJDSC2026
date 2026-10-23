import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import NephraFace from '../components/NephraFace'
import ThemeToggle from '../components/ThemeToggle'
import { Aurora } from '../sections/Hero'
import { ROLES } from '../data/content'
import { useGo } from '../hooks/useGo'
import { api } from '../lib/api'
import { useUIStore } from '../store/useUIStore'

// /account: where a staff member lands after signing in, until their role's screens are ported.
// Shows who is signed in (checked with GET /auth/me) and lets them change the password the CHO emailed them.
export default function Account() {
  const session = useUIStore((s) => s.session)
  if (!session) return <Navigate to="/login/doctor" replace />
  return <AccountPage session={session} />
}

function AccountPage({ session }) {
  const go = useGo()
  const setSession = useUIStore((s) => s.setSession)
  const [error, setError] = useState('')
  const r = ROLES[session.role]

  // the stored session may be stale (renamed, disabled); a 401 here signs out through api.js
  useEffect(() => {
    let live = true
    api.auth.me()
      .then((me) => { if (live) setSession({ ...useUIStore.getState().session, name: me.fullName, user: me }) })
      .catch((e) => { if (live && e.status !== 401) setError(e.message) })
    return () => { live = false }
  }, [setSession])

  function signOut() {
    setSession(null)
    go('home')
  }

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
          <div className="eyebrow text-white/70">Signed in</div>
          <h2>{session.name}</h2>
          <p>{session.user?.email}<br />{r?.name || session.user?.role}</p>
          <div className="neph">
            <span className="mini"><NephraFace emotion="happy" size={54} /></span>
            <span>The {r?.short || r?.name || 'staff'} screens are not ported to React yet. You can change your password here.</span>
          </div>
          <p className="fine">If the City Health Office emailed you a password, change it the first time you sign in.</p>
        </aside>
        <div className="auth-form">
          <div className="eyebrow">Account</div>
          <h1>Change password</h1>
          {error && <div className="note mt-3.5" role="alert">{error}</div>}
          <ChangePassword />
          <button className="btn mt-6 w-full" type="button" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

const EMPTY = { current: '', next: '', confirm: '' }

function ChangePassword() {
  const notify = useUIStore((s) => s.notify)
  const [f, setF] = useState(EMPTY)
  const [bad, setBad] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useRef(null)

  const field = (k) => ({
    id: 'pw-' + k, name: k, type: 'password', value: f[k],
    onChange: (e) => { setF({ ...f, [k]: e.target.value }); setBad(bad.filter((b) => b !== k)) },
    className: clsx('in', bad.includes(k) && 'bad'), 'aria-invalid': bad.includes(k) || undefined,
  })

  function fail(fields, text) {
    setBad(fields)
    setMsg(text)
    form.current?.querySelector(`[name="${fields[0]}"]`)?.focus()
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    if (!f.current) return fail(['current'], 'Enter your current password.')
    if (f.next.length < 8 || f.next.length > 128) return fail(['next'], 'Use 8 to 128 characters for the new password.')
    if (f.next === f.current) return fail(['next'], 'The new password must be different from the current one.')
    if (f.confirm !== f.next) return fail(['confirm'], 'The two new passwords do not match.')
    setBusy(true)
    setMsg('')
    try {
      await api.auth.changePassword(f.current, f.next)
      setF(EMPTY)
      setBad([])
      notify('Password changed.')
    } catch (err) {
      // 400 from the API means the current password was wrong
      if (err.status === 400) fail(['current'], err.message)
      else setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={form} noValidate onSubmit={onSubmit}>
      <label className="f" htmlFor="pw-current">Current password</label>
      <input {...field('current')} autoComplete="current-password" />
      <label className="f" htmlFor="pw-next">New password</label>
      <input {...field('next')} autoComplete="new-password" placeholder="At least 8 characters" />
      <label className="f" htmlFor="pw-confirm">Confirm new password</label>
      <input {...field('confirm')} autoComplete="new-password" />
      <p className={clsx('text-[13px] min-h-5 mt-2', msg ? 'text-high' : 'muted')} role="status">{msg}</p>
      <button className="btn primary w-full" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  )
}
