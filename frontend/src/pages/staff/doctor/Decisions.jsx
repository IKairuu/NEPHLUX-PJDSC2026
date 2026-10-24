import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../../../components/Icon'
import { api } from '../../../lib/api'
import { pct } from '../../../lib/format'
import { useApi } from '../../../hooks/useApi'
import { DecisionChip, Head, Live, RiskChip, Status, UacrCell, isoDate } from '../ui'
import ReferralSlip from './ReferralSlip'

const FILTERS = [['', 'All'], ['APPROVED', 'Approved'], ['OVERRIDDEN', 'Overridden'], ['NO_REFERRAL', 'No referral']]
const LIMIT = 25

// GET /referrals: every decision made at the doctor's clinic, newest first
export default function Decisions() {
  const [decision, setDecision] = useState('')
  const [page, setPage] = useState(1)
  const [slipId, setSlipId] = useState(null)
  const q = useApi(() => api.referrals.list({ decision, page, limit: LIMIT }), [decision, page])
  const rows = q.data?.data || [], total = q.data?.meta.total ?? 0, pages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <>
      <Head eyebrow="Decisions" title={<>Referrals and <span className="serif">decisions</span></>}
        text="Every decision made at your clinic. Decisions are final; each one is in the audit log.">
        <Live />
      </Head>
      <div className="flex justify-between items-center gap-2.5 flex-wrap mb-3">
        <div className="seg" role="group" aria-label="Filter by decision">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={decision === k ? 'on' : undefined} aria-pressed={decision === k} onClick={() => { setDecision(k); setPage(1) }}>{label}</button>
          ))}
        </div>
        {q.data && <span className="muted text-[13px]">{total} decision{total === 1 ? '' : 's'}</span>}
      </div>
      <div className="card">
        <Status q={q} empty={q.data && !rows.length && 'No decisions yet.'}>
          <div className="tw">
            <table className="t">
              <thead><tr><th>Decided</th><th>Patient</th><th>Barangay</th><th>Risk</th><th>Decision</th><th>By</th><th>uACR</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{isoDate(r.decidedAt)}</td>
                    <td><Link className="underline" to={`/doctor/assessments/${r.assessmentId}`}>{r.patient.initials}</Link></td>
                    <td>{r.patient.barangay}</td>
                    <td><span className="inline-flex gap-1.5 items-center"><RiskChip level={r.riskLevel} />{r.probability != null && <span className="mono text-xs">{pct(r.probability)}</span>}</span></td>
                    <td><DecisionChip decision={r.decision} />{r.overrideReason && <div className="muted text-xs mt-1 max-w-[260px] whitespace-normal">{r.overrideReason}</div>}</td>
                    <td className="text-[13px]">{r.decidedBy.fullName}</td>
                    <td className="mono"><UacrCell value={r.latestUacrMgG} /></td>
                    <td className="text-right">
                      {r.decision === 'APPROVED' && (
                        <button className="btn xs" onClick={() => setSlipId(r.id)}><Icon name="print" />{r.slipPrintedAt ? 'Reprint' : 'Slip'}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-3">
              <button className="btn xs" disabled={page === 1} onClick={() => setPage(page - 1)}><Icon name="back" />Newer</button>
              <span className="muted text-[13px]">Page {page} of {pages}</span>
              <button className="btn xs" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older<Icon name="arrow" /></button>
            </div>
          )}
        </Status>
      </div>
      {slipId && <ReferralSlip id={slipId} onClose={() => { setSlipId(null); q.reload() }} />}
    </>
  )
}
