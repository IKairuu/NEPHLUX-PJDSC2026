import { useState } from 'react'
import { Link } from 'react-router'
import clsx from 'clsx'
import Icon from '../../../components/Icon'
import { allPages, api } from '../../../lib/api'
import { useApi } from '../../../hooks/useApi'
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
    over: rows.filter((r) => r.decision === 'OVERRIDDEN' && open(r)),
    recheck: rows.filter((r) => r.decision === 'NO_REFERRAL' && r.recheckDue),
    done: rows.filter((r) => !open(r)),
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
        <Icon name="info" /> Results are shown when the uACR value is on record. Recording a result from this screen needs an API endpoint for uACR results, which the backend does not have yet.
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
                  {r.decision !== 'NO_REFERRAL' && <button className="btn sm" onClick={() => setSlipId(r.id)}><Icon name="print" />Slip</button>}
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
