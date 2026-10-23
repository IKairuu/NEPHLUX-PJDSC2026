import { Link } from 'react-router'
import Icon from '../../../components/Icon'
import { api } from '../../../lib/api'
import { pct } from '../../../lib/format'
import { useApi } from '../../../hooks/useApi'
import { useUIStore } from '../../../store/useUIStore'
import { Head, Kpi, Live, RiskChip, Status, daysSince } from '../ui'

// GET /assessments?status=PENDING is the queue: scored assessments still waiting for the doctor's decision
export default function Queue() {
  const name = useUIStore((s) => s.session?.name)
  const summary = useApi(() => api.assessments.summary())
  const queue = useApi(() => api.assessments.list({ status: 'PENDING', limit: 50 }))
  const s = summary.data, rows = queue.data?.data || []
  const clinic = rows[0]?.clinic?.name

  return (
    <>
      <Head eyebrow={'YAKAP clinic' + (clinic ? ' · ' + clinic : '')} title={`Good day, ${name}.`}
        text="Patients whose YAKAP labs are in and scored, waiting for your decision. Open one to review the risk and decide.">
        <Live />
      </Head>
      <div className="kpis">
        <Kpi lead label="Waiting for you" value={s?.waitingForDecision} text="scored, no decision yet" />
        <Kpi label="Reviewed, 30 days" value={s?.reviewedLast30Days} text="at your clinic" />
        <Kpi label="Referred, 30 days" value={s?.referredLast30Days} text="for a uACR test" />
        <Kpi label="Your decisions" value={s?.myDecisions} text="all time" />
      </div>
      {summary.error && <p className="text-high text-[13px] mt-2" role="alert">{summary.error.message}</p>}

      <div className="cols mt-4">
        <div className="card">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="eyebrow">Queue{queue.data ? ` · ${queue.data.meta.total} waiting` : ''}</div>
            <Link className="btn sm" to="/doctor/assess"><Icon name="flask" />New assessment</Link>
          </div>
          <div className="mt-3">
            <Status q={queue} empty={queue.data && !rows.length && 'Nobody is waiting. Start a new assessment when a patient\'s YAKAP labs are in.'}>
              <div className="queue">
                {rows.map((a) => (
                  <Link key={a.id} className="qrow" to={`/doctor/assessments/${a.id}`}>
                    <span className="av">{a.patient.initials}</span>
                    <span>
                      <b>{a.patient.initials} · {a.inputs.age} y · {a.patient.barangay.name}</b>
                      <small>
                        Assessed {daysSince(a.assessedOn) === 0 ? 'today' : `${daysSince(a.assessedOn)} days ago`}
                        {a.risk && ` · ${pct(a.risk.probability)} chance`}
                        {a.residentCode && ' · came with a resident code'}
                      </small>
                    </span>
                    <RiskChip level={a.risk?.riskLevel} />
                  </Link>
                ))}
              </div>
              {queue.data?.meta.total > rows.length && <p className="muted text-[12.5px] mt-2.5">Showing the first {rows.length} of {queue.data.meta.total}.</p>}
            </Status>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">How the assessment works</div>
          <ol className="muted list-decimal pl-[18px] text-sm mt-3 grid gap-2">
            <li>Load the resident's clinic code, or type the history.</li>
            <li>Enter BP and the YAKAP labs. The server scores them and the patient joins this queue.</li>
            <li>Review the chance of albuminuria and its top reasons.</li>
            <li>Approve, override with a reason, or decline. You are responsible for the decision.</li>
            <li>Print the uACR referral slip.</li>
          </ol>
          <div className="note warn mt-3.5 text-[13px]">
            <Icon name="alert" /> YAKAP urinalysis is not used by the model (the U.S. data has no dipstick). A positive dipstick protein should raise concern whatever the score.
          </div>
        </div>
      </div>
    </>
  )
}
