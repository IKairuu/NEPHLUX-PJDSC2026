import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Icon, { BrandMark } from './Icon'
import PortalMenu from './PortalMenu'
import ThemeToggle from './ThemeToggle'
import { SECTIONS } from '../data/content'
import { useUIStore } from '../store/useUIStore'
import { useGo } from '../hooks/useGo'

export default function Nav() {
  const navigate = useGo()
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen)
  // the bar is light over the hero and turns dark once the hero has scrolled away
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const onScroll = () => setDark(window.scrollY > window.innerHeight * 0.82)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={clsx('nav', dark && 'dark')}>
      <a className="brand" href="#top" aria-label="NEPHLUX home"><BrandMark />NEPHLUX</a>
      <nav className="nav-links" aria-label="Sections">
        {SECTIONS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <button className="btn ghost hide-sm" onClick={() => navigate('demo')}>Guided demo</button>
      <PortalMenu />
      <button className="btn ghost hide-sm" onClick={() => navigate('register')}>Register</button>
      <ThemeToggle />
      <button className="icon-btn burger" aria-label="Open menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}>
        <Icon name="menu" className="" />
      </button>
    </header>
  )
}
