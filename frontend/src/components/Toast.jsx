import { useUIStore } from '../store/useUIStore'

export default function Toast() {
  const { text, on } = useUIStore((s) => s.toast)
  return <div id="toast" className={on ? 'on' : undefined} role="status" aria-live="polite">{text}</div>
}
