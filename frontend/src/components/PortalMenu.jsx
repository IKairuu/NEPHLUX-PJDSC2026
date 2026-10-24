import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import Icon from './Icon'
import { ROLES, ROLE_KEYS } from '../data/content'
import { useUIStore } from '../store/useUIStore'
import { useGo } from '../hooks/useGo'

export default function PortalMenu() {
  const open = useUIStore((s) => s.portalOpen)
  const setOpen = useUIStore((s) => s.setPortalOpen)
  const navigate = useGo()
  const root = useRef(null), btn = useRef(null), menu = useRef(null)

  useEffect(() => {
    if (!open) return
    menu.current.querySelector('button')?.focus()
    const onClick = (e) => { if (!root.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current.focus() } }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [open, setOpen])

  function onMenuKey(e) {
    const items = Array.from(menu.current.querySelectorAll('button'))
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus() }
  }

  return (
    <div className="portal" ref={root}>
      <button ref={btn} className="btn solid portal-btn" aria-haspopup="true" aria-expanded={open} aria-controls="portalMenu" onClick={() => setOpen(!open)}>
        Access Portal <Icon name="chev" className="car ic" />
      </button>
      <div ref={menu} className={clsx('menu', open && 'on')} id="portalMenu" role="menu" aria-label="Access Portal" inert={!open} onKeyDown={onMenuKey}>
        <div className="mh">Sign in as</div>
        {ROLE_KEYS.map((k) => (
          <button key={k} role="menuitem" onClick={() => navigate(`login:${k}`)}>
            <span className="ri"><Icon name={ROLES[k].icon} className="" /></span>
            <span><b>{ROLES[k].name}</b><small>{ROLES[k].blurb}</small></span>
          </button>
        ))}
        <div className="mf">Staff sign in with a City Health Office account. Not connected to PhilHealth systems.</div>
      </div>
    </div>
  )
}
