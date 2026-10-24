import NephraFace from './NephraFace'
import { useUIStore } from '../store/useUIStore'

export default function NephraFab() {
  const open = useUIStore((s) => s.nephraOpen)
  const setOpen = useUIStore((s) => s.setNephraOpen)
  if (open) return null
  return (
    <button id="nfab" className="nfab" aria-label="Ask Nephra, the help assistant" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className="orb" aria-hidden="true"><NephraFace emotion="happy" size={44} /></span><span>Ask Nephra</span>
    </button>
  )
}
