import Icon from './Icon'

// one meaning per colour, always with a word and an icon
const LEVELS = {
  high: { text: 'Higher risk', icon: 'up' },
  moderate: { text: 'Moderate risk', icon: 'dia' },
  low: { text: 'Lower risk', icon: 'dot' },
  higher: { text: 'Higher chance', icon: 'up' },
  lower: { text: 'Lower chance', icon: 'dot' },
}

// text replaces the English label, for example a translated one on the resident result
export function LevelChip({ level, text }) {
  const o = LEVELS[level]
  return <span className={`chip ${level}`}><Icon name={o.icon} />{text || o.text}</span>
}

export function Chip({ kind, icon, children }) {
  return <span className={`chip ${kind}`}><Icon name={icon} />{children}</span>
}

export function PassChip({ pass }) {
  return pass ? <Chip kind="pass" icon="check">Pass</Chip> : <Chip kind="fail" icon="x">Fail</Chip>
}
