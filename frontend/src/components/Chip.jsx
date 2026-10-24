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
  return <span className={`chip ${kind}`}>{icon && <Icon name={icon} />}{children}</span>
}

// a missed pre-registered criterion reads "Not met" in neutral grey: it is a reported result, not an error
export function PassChip({ pass }) {
  return pass ? <Chip kind="pass" icon="check">Pass</Chip> : <Chip kind="notmet" icon="dot">Not met</Chip>
}
