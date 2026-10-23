import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import Icon, { BrandMark } from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { ROLES, ROLE_KEYS } from '../data/content'
import { useGo } from '../hooks/useGo'

// Access Portal sign-in. Only the resident view is ported; residents need no account.
export default function SignIn() {
  const go = useGo()
  const start = useRef(null)
  useEffect(() => { start.current?.focus({ preventScroll: true }) }, [])

  return (
    <div className="auth">
      <div className="auth-art">
        <Link className="brand text-white" to="/"><BrandMark className="bg-white/14" />NEPHLUX</Link>
        <div className="big">
          <h2>One pathway, four roles.</h2>
          <p>Residents check without an account. Clinic staff, health workers and the City Health Office sign in to their own screens.</p>
        </div>
        <p className="text-[12.5px] text-white/70">Prototype sign-in for demonstration only. It is not secure and is not connected to PhilHealth or to real patient records.</p>
      </div>
      <div className="auth-form">
        <button className="btn sm ghost self-start mb-[22px]" onClick={() => go('home')}><Icon name="back" />Back to home</button>
        <div className="eyebrow">Access Portal</div>
        <h1 className="mt-2">Resident</h1>
        <div className="rolepick" role="group" aria-label="Role">
          {ROLE_KEYS.map((k) => (
            <button key={k} type="button" aria-pressed={k === 'resident'} onClick={() => go(`login:${k}`)}>
              <Icon name={ROLES[k].icon} className="" />{ROLES[k].short || ROLES[k].name}
            </button>
          ))}
        </div>
        <div className="note mt-3.5">
          <b>Residents don't need an account.</b> The awareness check keeps nothing: your answers stay on your screen and leave only as a short clinic code that you choose to show.
        </div>
        <button ref={start} className="btn primary mt-[18px] w-full" onClick={() => go('resident')}><Icon name="arrow" />Start the 2-minute check</button>
        <ThemeToggle className="mt-6" />
      </div>
    </div>
  )
}
