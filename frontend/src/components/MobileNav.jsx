import { useEffect, useRef } from 'react'
import Icon, { BrandMark } from './Icon'
import { ROLES, ROLE_KEYS, SECTIONS } from '../data/content'
import { useUIStore } from '../store/useUIStore'
import { useGo } from '../hooks/useGo'

export default function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen)
  const setOpen = useUIStore((s) => s.setMobileNavOpen)
  const navigate = useGo()
  const closeBtn = useRef(null)

  useEffect(() => {
    if (!open) return
    closeBtn.current.focus()
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null
  const close = () => setOpen(false)
  return (
    <div className="mnav" role="dialog" aria-label="Menu" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="panel">
        <div className="flex justify-between items-center mb-2.5">
          <span className="brand"><BrandMark /></span>
          <button ref={closeBtn} className="icon-btn" aria-label="Close menu" onClick={close}><Icon name="x" className="" /></button>
        </div>
        {SECTIONS.map(([href, label]) => <a key={href} href={href} onClick={close}>{label}</a>)}
        <div className="eyebrow mt-3.5 mx-3 mb-1">Access Portal</div>
        {ROLE_KEYS.map((k) => (
          <button key={k} className="mrole" onClick={() => navigate(`login:${k}`)}><Icon name={ROLES[k].icon} />{ROLES[k].name}</button>
        ))}
        <div className="grid gap-2 mt-3.5">
          <button className="btn primary" onClick={() => navigate('demo')}><Icon name="play" />Guided demo</button>
          <button className="btn" onClick={() => navigate('register')}>Register (staff)</button>
        </div>
      </div>
    </div>
  )
}
