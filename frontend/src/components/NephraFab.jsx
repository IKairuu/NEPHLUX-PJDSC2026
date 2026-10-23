import { useGo } from '../hooks/useGo'

export default function NephraFab() {
  const navigate = useGo()
  return (
    <button className="nfab" aria-label="Ask Nephra, the help assistant" onClick={() => navigate('nephra')}>
      <span className="orb" aria-hidden="true" /><span>Ask Nephra</span>
    </button>
  )
}
