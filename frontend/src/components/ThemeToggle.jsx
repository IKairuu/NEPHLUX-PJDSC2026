import Icon from './Icon'
import { useUIStore } from '../store/useUIStore'

export default function ThemeToggle() {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const dark = theme === 'dark'
  return (
    <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Icon name={dark ? 'sun' : 'moon'} className="" />
    </button>
  )
}
