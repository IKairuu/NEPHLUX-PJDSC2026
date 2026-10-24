import { useState } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'
import Icon from '../../../components/Icon'
import { allPages, api } from '../../../lib/api'
import { useApi } from '../../../hooks/useApi'
import { useUIStore } from '../../../store/useUIStore'
import { Head, Kpi, Live, RiskChip, Status, UacrCell, daysSince, isoDate } from '../ui'
import ReferralSlip from './ReferralSlip'

const MISSED_AFTER = 14

// The clinic that orders a uACR test follows it up. Built from GET /referrals (all pages), grouped here.
const TABS = [
  ['missed', 'Missed', 'Referred, but no uACR result after 14 days. Remind them by text or call, using the clinic\'s usual outreach. Oldest first; over 60 days is marked.', 'clock'],
  ['pending', 'Pending', 'Referred in the last 14 days.', 'clock'],
  ['over', 'Overrides', 'You declined a suggested referral. Check that the repeat labs were done.', 'alert'],
  ['recheck', 'Recheck', 'Moderate risk, not referred. YAKAP labs again by the due date.', 'dia'],
  ['done', 'Completed', 'uACR result on record.', 'check'],
]

function group(rows) {
  const open = (r) => r.latestUacrMgG == null
  const G = {
    missed: rows.filter((r) => r.decision === 'APPROVED' && open(r) && daysSince(r.decidedAt) > MISSED_AFTER),
    pending: rows.filter((r) => r.decision === 'APPROVED' && open(r) && daysSince(r.decidedAt) <= MISSED_AFTER),
    over: rows.filter((r) => r.decision === 'OVERRIDDEN'),
    recheck: rows.filter((r) => r.decision === 'NO_REFERRAL' && r.recheckDue),
    done: rows.filter((r) => r.decision === 'APPROVED' && !open(r)),
  }
  for (const k in G) G[k].sort((a, b) => new Date(a.decidedAt) - new Date(b.decidedAt))
  G.recheck.sort((a, b) => new Date(a.recheckDue) - new Date(b.recheckDue))
  return G
}

export default function Followup() {
  const [tab, setTab] = useState('missed')
  const [slipId, setSlipId] = useState(null)
  const q = useApi(() => allPages(api.referrals.list))
  const G = q.data ? group(q.data.rows) : null
  const T = TABS.find((t) => t[0] === tab), list = G?.[tab] || []

  return (
    <>
      <Head eyebrow="YAKAP clinic · follow-up" title={<>Who still needs their <span className="serif">uACR</span>?</>}
        text="Your clinic made these referrals, so your clinic follows them up.">
        <Live />
      </Head>
      <div className="kpis five fu-kpis">
        {TABS.map(([k, label], i) => <Kpi key={k} lead={i === 0} label={label} value={G?.[k].length} text={i === 0 ? 'need a reminder' : undefined} />)}
      </div>
      <div className="note text-[13px] mt-3.5">
        <Icon name="info" /> When the lab sends a uACR result, record it here. Results are not edited: a wrong entry is followed by a repeat result.
      </div>
      <div className="ftabs" role="tablist" aria-label="Follow-up lists">
        {TABS.map(([k, label, , icon]) => (
          <button key={k} role="tab" aria-selected={k === tab} onClick={() => setTab(k)}><Icon name={icon} />{label} <b>{G?.[k].length ?? '·'}</b></button>
        ))}
      </div>
      <p className="muted text-[13.5px] mb-3">{T[2]}</p>
      <Status q={q} empty={q.data && !list.length && 'Nobody in this list.'}>
        <div className="plist" role="tabpanel">
          {list.map((r) => {
            const days = daysSince(r.decidedAt)
            return (
              <div key={r.id} className={clsx('prow', tab === 'missed' && days > 60 && 'over60')}>
                <span className="av">{r.patient.initials}</span>
                <span>
                  <b>{r.patient.initials}</b>
                  <small>{r.patient.barangay} · decided {isoDate(r.decidedAt)}{r.recheckDue && ` · recheck by ${isoDate(r.recheckDue)}`}</small>
                  {r.overrideReason && <small>Doctor's note: {r.overrideReason}</small>}
                </span>
                <span className="hide-m"><RiskChip level={r.riskLevel} /></span>
                <span className="days">{r.latestUacrMgG != null ? <UacrCell value={r.latestUacrMgG} /> : `${days} days`}</span>
                <span className="act">
                  <Link className="btn sm" to={`/doctor/assessments/${r.assessmentId}`}>Open</Link>
                  {r.decision === 'APPROVED' && <button className="btn sm" onClick={() => setSlipId(r.id)}><Icon name="print" />Slip</button>}
                  {r.decision === 'APPROVED' && <RecordUacr assessmentId={r.assessmentId} repeat={r.latestUacrMgG != null} onDone={q.reload} />}
                </span>
              </div>
            )
          })}
        </div>
        {q.data && q.data.rows.length < q.data.total && <p className="muted text-[13px] mt-2.5">Showing the latest {q.data.rows.length} of {q.data.total} decisions.</p>}
      </Status>
      {slipId && <ReferralSlip id={slipId} onClose={() => setSlipId(null)} />}
    </>
  )
}

// POST /uacr-results for one referral. The API answers with a message (for example, suspected albuminuria).
function RecordUacr({ assessmentId, repeat, onDone }) {
  const notify = useUIStore((s) => s.notify)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [bad, setBad] = useState(false)

  if (!open) return <button className="btn sm" onClick={() => setOpen(true)}><Icon name="flask" />{repeat ? 'Repeat uACR' : 'Record uACR'}</button>

  async function save(e) {
    e.preventDefault()
    const v = Number(value)
    if (value.trim() === '' || !Number.isFinite(v) || v < 0 || v > 5000) return setBad(true)
    setBusy(true)
    try {
      const res = await api.uacrResults.create({ assessmentId, valueMgG: Math.round(v * 10) / 10 })
      notify(res.message)
      setOpen(false)
      setValue('')
      onDone()
    } catch (err) {
      notify(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="rec" onSubmit={save} noValidate>
      <label className="sr-only" htmlFor={`u-${assessmentId}`}>uACR result in mg/g</label>
      <input id={`u-${assessmentId}`} className={clsx('in', bad && 'bad')} inputMode="decimal" placeholder="mg/g" autoFocus value={value}
        onChange={(e) => { setValue(e.target.value); setBad(false) }} />
      <button className="btn sm primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      <button className="btn sm" type="button" onClick={() => setOpen(false)} aria-label="Cancel"><Icon name="x" /></button>
    </form>
  )
}
