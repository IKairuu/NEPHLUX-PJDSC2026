import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import clsx from 'clsx'
import Icon, { BrandMark } from '../components/Icon'
import NephraFace from '../components/NephraFace'
import ThemeToggle from '../components/ThemeToggle'
import { Aurora } from '../sections/Hero'
import { ROLES } from '../data/content'
import { BARANGAYS, CHO_UNITS, CLINICS } from '../data/city'
import { useGo } from '../hooks/useGo'
import { REGISTER_ROLES, useRegisterStore } from '../store/useRegisterStore'
import './register.css'

const SUBTITLE = { doctor: 'YAKAP clinic', bhw: 'One barangay', cho: 'City-wide counts' }
const CHECKED_BY = { doctor: 'the PRC licence and the YAKAP clinic', bhw: "with the barangay's nurse", cho: 'with the unit head' }

// /register/:role. Residents never register, so any other role falls back to the doctor form, as in the prototype.
export default function RegisterRoute() {
  const { role } = useParams()
  if (!REGISTER_ROLES.includes(role)) return <Navigate to="/register/doctor" replace />
  return <Register role={role} />
}

function Register({ role }) {
  const go = useGo()
  const sent = useRegisterStore((s) => s.sent)
  const setRole = useRegisterStore((s) => s.setRole)
  const reset = useRegisterStore((s) => s.reset)

  useEffect(() => { setRole(role) }, [role, setRole])
  useEffect(() => reset, [reset]) // nothing typed outlives the page

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
          <div className="eyebrow text-white/70">Request staff access</div>
          <h2>Staff accounts are invited, not open.</h2>
          <p>Residents never need an account. Doctors, health workers and City Health Office staff ask for access; the City Health Office checks who they are, then sends an invite.</p>
          <ol className="steps3" aria-label="How access works">
            <li><b>1</b> Request</li><li><b>2</b> CHO checks</li><li><b>3</b> Invite by email</li>
          </ol>
          <div className="neph">
            <span className="mini"><NephraFace emotion="explaining" size={54} /></span>
            <span>Doctors are checked against their PRC licence and YAKAP clinic. Health workers are confirmed by their barangay's nurse.</span>
          </div>
          <p className="fine">Prototype sign-in for demonstration only. It is not secure and is not connected to PhilHealth or to real patient records.</p>
        </aside>
        <div className="auth-form">
          {sent ? <Sent role={role} /> : <RequestForm role={role} />}
        </div>
      </div>
    </div>
  )
}

function RequestForm({ role }) {
  const go = useGo()
  const navigate = useNavigate()
  const fields = useRegisterStore((s) => s.fields)
  const errors = useRegisterStore((s) => s.errors)
  const message = useRegisterStore((s) => s.message)
  const setField = useRegisterStore((s) => s.setField)
  const submit = useRegisterStore((s) => s.submit)
  const form = useRef(null)

  useEffect(() => { form.current?.querySelector('input')?.focus({ preventScroll: true }) }, [])

  function onSubmit(e) {
    e.preventDefault()
    if (submit()) return
    const first = useRegisterStore.getState().errors[0]
    form.current?.querySelector(`[name="${first}"]`)?.focus()
  }

  // shared props for every field: value from the store, red outline while it fails
  const field = (k) => ({
    id: 'rg-' + k, name: k, value: fields[k], onChange: (e) => setField(k, e.target.value),
    className: clsx('in', errors.includes(k) && 'bad'), 'aria-invalid': errors.includes(k) || undefined,
  })
  const bhw = role === 'bhw'

  return (
    <>
      <div className="eyebrow">Request access · staff</div>
      <h1>{ROLES[role].name} access</h1>
      <div className="rolepick three" role="group" aria-label="Role">
        {REGISTER_ROLES.map((k) => (
          <button key={k} type="button" aria-pressed={k === role} onClick={() => navigate(`/register/${k}`, { replace: true })}>
            <span className="ri"><Icon name={ROLES[k].icon} className="" /></span>
            <span>{ROLES[k].short || ROLES[k].name}<small>{SUBTITLE[k]}</small></span>
          </button>
        ))}
      </div>

      <form ref={form} noValidate onSubmit={onSubmit}>
        <label className="f" htmlFor="rg-name">Full name</label>
        <input {...field('name')} autoComplete="off" placeholder="e.g. Ana Reyes" />

        {role === 'doctor' && (
          <>
            <label className="f" htmlFor="rg-prc">PRC licence no.</label>
            <input {...field('prc')} inputMode="numeric" maxLength={7} autoComplete="off" placeholder="7 digits (fictional for the demo)" />
            <label className="f" htmlFor="rg-place">YAKAP clinic</label>
            <select {...field('place')}>
              <option value="">Choose your clinic</option>
              {CLINICS.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.public ? 'public' : 'private'})</option>)}
            </select>
          </>
        )}
        {bhw && (
          <>
            <label className="f" htmlFor="rg-place">Barangay you cover</label>
            <select {...field('place')}>
              <option value="">Choose barangay</option>
              {BARANGAYS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </>
        )}
        {role === 'cho' && (
          <>
            <label className="f" htmlFor="rg-place">Unit</label>
            <select {...field('place')}>
              <option value="">Choose your unit</option>
              {CHO_UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </>
        )}

        <label className="f" htmlFor="rg-contact">{bhw ? 'Mobile number or email' : 'Work email'}</label>
        <input {...field('contact')} type={bhw ? 'text' : 'email'} autoComplete="off"
          placeholder={bhw ? '09xx xxx xxxx or name@email.com' : 'name@clinic.example'} />

        <p className={clsx('text-[13px] min-h-5 mt-2', message ? 'text-high' : 'muted')} role="status">{message}</p>
        <button className="btn primary w-full" type="submit">Send access request</button>
      </form>

      <p className="muted text-[12.5px] mt-3">Demo only: nothing you type here is saved or sent. To look around now, use the demo account instead.</p>
      <p className="muted text-[13px] mt-2">
        Already invited? <Link to={`/login/${role}`} onClick={(e) => { e.preventDefault(); go(`login:${role}`) }}>Sign in</Link>
      </p>
    </>
  )
}

function Sent({ role }) {
  const go = useGo()
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  return (
    <div className="text-center my-auto py-5">
      <div className="w-[140px] mx-auto"><NephraFace emotion="celebrating" size={140} title="Nephra, celebrating" /></div>
      <h1 ref={heading} tabIndex={-1} className="mt-2 outline-none">Request ready</h1>
      <p className="muted mt-2.5">
        In a real rollout the City Health Office would now check {CHECKED_BY[role]}, then send an invite. In this demo nothing was saved or sent.
      </p>
      <div className="grid gap-2 mt-5">
        <button className="btn primary" onClick={() => go(`login:${role}`)}>Use the demo account instead</button>
        <button className="btn" onClick={() => go('home')}>Back to home</button>
      </div>
    </div>
  )
}
