import { useEffect } from 'react'
import { Link } from 'react-router'
import Icon, { BrandMark } from './Icon'
import ThemeToggle from './ThemeToggle'
import { useGo } from '../hooks/useGo'

// App shell for residents: top bar only, no side navigation (residents have no account).
export default function ResidentShell({ children }) {
  const go = useGo()
  useEffect(() => {
    document.body.classList.add('in-app')
    return () => document.body.classList.remove('in-app')
  }, [])
  return (
    <div className="app resident">
      <div>
        <div className="top">
          <Link className="brand mr-1.5" to="/"><BrandMark /></Link>
          <span className="crumb" />
          <span className="rolechip"><Icon name="res" />Resident</span>
          <button className="btn sm ghost" onClick={() => go('home')}>Home</button>
          <ThemeToggle />
        </div>
        <main className="main" id="main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  )
}
