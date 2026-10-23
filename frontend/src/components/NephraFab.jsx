import { useUIStore } from '../store/useUIStore'

export default function NephraFab() {
  const navigate = useUIStore((s) => s.navigate)
  return (
    <button className="nfab" aria-label="Ask Nephra, the help assistant" onClick={() => navigate('nephra')}>
      <span className="orb" aria-hidden="true" /><span>Ask Nephra</span>
    </button>
  )
}
