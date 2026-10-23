import Icon from '../../components/Icon'
import { Chip, LevelChip } from '../../components/Chip'

export function Head({ eyebrow, title, text, children }) {
  return (
    <div className="head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1.5">{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  )
}

export function Kpi({ label, value, text, lead }) {
  return (
    <div className={lead ? 'kpi lead' : 'kpi'}>
      <div className="eyebrow">{label}</div>
      <div className="v">{value ?? '—'}</div>
      {text && <p>{text}</p>}
    </div>
  )
}

// What a screen shows while its data loads or when the API call failed
export function Status({ q, empty, children }) {
  if (q.error) {
    return (
      <div className="state" role="alert">
        <p className="text-high">{q.error.message}</p>
        <button className="btn sm mt-3" onClick={q.reload}>Try again</button>
      </div>
    )
  }
  if (!q.data) return <div className="state" role="status">Loading…</div>
  if (empty) return <div className="state">{empty}</div>
  return children
}

// the API's HIGH / MODERATE / LOW -> the chip classes high / moderate / low
export const levelKey = (l) => (l ? l.toLowerCase() : null)
export const RiskChip = ({ level }) => (level ? <LevelChip level={levelKey(level)} /> : <span className="chip missing">No estimate</span>)

const DECISION = {
  APPROVED: ['referral', 'Referral approved', 'check'],
  OVERRIDDEN: ['follow', 'Overridden', 'alert'],
  NO_REFERRAL: ['missing', 'No referral', 'dot'],
}
export function DecisionChip({ decision }) {
  const [kind, text, icon] = DECISION[decision] || DECISION.NO_REFERRAL
  return <Chip kind={kind} icon={icon}>{text}</Chip>
}

const DAY = 864e5
export const daysSince = (d) => Math.floor((Date.now() - new Date(d)) / DAY)
export const isoDate = (d) => new Date(d).toISOString().slice(0, 10)
export const peso = (x) => '₱' + Math.round(x).toLocaleString('en-PH')

export function UacrCell({ value }) {
  if (value == null) return <span className="muted">—</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      {value} mg/g {value >= 30 ? <Chip kind="high" icon="up">≥30</Chip> : <Chip kind="done" icon="check">&lt;30</Chip>}
    </span>
  )
}

export const Sample = () => <span className="sample">SAMPLE records</span>
export const Live = ({ children = 'From the API' }) => <span className="live"><Icon name="check" />{children}</span>
