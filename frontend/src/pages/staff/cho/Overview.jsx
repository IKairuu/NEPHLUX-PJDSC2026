import { useEffect, useMemo, useState } from 'react'
import { api, barangayList } from '../../../lib/api'
import { CLINICS, km } from '../../../lib/city'
import { escapeHtml as h, pct } from '../../../lib/format'
import { useApi } from '../../../hooks/useApi'
import { Head, Kpi, Live, Status, peso } from '../ui'
import CityMap from './CityMap'

const PUBLIC = CLINICS.filter((c) => c.public)

// counts from /city-insights are numbers, or "<5" when a cell is too small to show
const sup = (n) => (n == null ? '—' : typeof n === 'number' ? n.toLocaleString() : n)
const num = (n) => (typeof n === 'number' ? n : 0)
const per1k = (v) => (v == null ? '—' : v.toFixed(1))

// Outlines and centres from GET /barangays, joined with the counts from GET /city-insights/overview,
// plus the nearest public YAKAP clinic for the map popup
function join(geo, stats) {
  const by = new Map(stats.map((s) => [s.id, s]))
  return geo.map((b) => {
    let near = null
    if (b.centre) {
      for (const c of PUBLIC) {
        const d = km([b.centre.lat, b.centre.lon], [c.lat, c.lon])
        if (!near || d < near.km) near = { name: c.name, km: d }
      }
    }
    return { ...b, stats: by.get(b.id) || null, near }
  })
}

// map colour. raw is null when the API withheld a rate (small counts); it colours as 0 and reads as "—"
const METRICS = {
  reach: { label: 'Screened per 1,000', raw: (b) => b.stats?.screenedPer1000 ?? null, f: (v) => v.toFixed(1) },
  done: { label: 'Referrals completed', raw: (b) => b.stats?.completedShare ?? null, f: (v) => pct(v) },
  pop: { label: 'Population 2020', raw: (b) => b.pop2020, f: (v) => Math.round(v).toLocaleString() },
}
for (const m of Object.values(METRICS)) m.v = (b) => m.raw(b) ?? 0

function breaks(vals) { // 4 quantile classes over positive values; class 0 = none
  const nz = vals.filter((v) => v > 0).sort((a, b) => a - b)
  if (!nz.length) return [0, 0, 0]
  return [0.25, 0.5, 0.75].map((q) => nz[Math.min(nz.length - 1, Math.floor(q * nz.length))])
}
const classOf = (v, br) => (!(v > 0) ? 0 : v < br[0] ? 1 : v < br[1] ? 2 : v < br[2] ? 3 : 4)

export default function Overview() {
  const [period, setPeriod] = useState(90)
  const [sector, setSector] = useState('ALL')
  const geo = useApi(() => barangayList({ includeBoundary: true }))
  const ov = useApi(() => api.cityInsights.overview({ period, sector }), [period, sector])
  const rows = useMemo(() => (geo.data && ov.data ? join(geo.data, ov.data.barangays) : null), [geo.data, ov.data])
  const both = { data: rows, error: geo.error || ov.error, reload: () => { geo.reload(); ov.reload() } }

  return (
    <>
      <Head eyebrow="City Health Office · Cagayan de Oro City" title={<>Where is screening <span className="serif">reaching</span>?</>}
        text={'80 barangays and the 42 YAKAP clinics on PhilHealth\'s list. This shows screening reach, not how common kidney disease is. No names leave the clinic; small counts show as "<5".'}>
        <div className="filters">
          <label className="sr-only" htmlFor="fPer">Period</label>
          <select className="in" id="fPer" value={period} onChange={(e) => setPeriod(+e.target.value)}>
            {[30, 60, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
          <label className="sr-only" htmlFor="fSec">Clinic type</label>
          <select className="in" id="fSec" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="ALL">All YAKAP clinics</option><option value="PUBLIC">Public clinics</option><option value="PRIVATE">Private clinics</option>
          </select>
          <Live />
        </div>
      </Head>
      <Status q={both}>
        {rows && <Body rows={rows} ov={ov.data} />}
      </Status>
      <Budget />
      <Strategies />
    </>
  )
}

function Spark({ weeks }) {
  const w = weeks.map(num), mx = Math.max(...w) || 1
  return (
    <svg className="spark" width="92" height="34" viewBox="0 0 92 34" role="img" aria-label="Screenings per week, last 13 weeks">
      {w.map((v, i) => {
        const hh = Math.max(2, (30 * v) / mx)
        return <rect key={i} x={i * 7} y={32 - hh} width="5" height={hh.toFixed(1)} rx="1.5" fill={`rgba(255,255,255,${i === w.length - 1 ? 0.95 : 0.45})`} />
      })}
    </svg>
  )
}

const FUNNEL_COLOUR = ['var(--ch2)', 'var(--high)', 'var(--plum)', 'var(--low)', 'var(--accent)']

function Body({ rows, ov }) {
  const [metric, setMetric] = useState('reach')
  const [base, setBase] = useState('outline')
  const [hl, setHl] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const M = METRICS[metric], T = ov.totals

  const br = useMemo(() => breaks(rows.map(M.v)), [rows, M])
  const cls = useMemo(() => (b) => classOf(M.v(b), br), [M, br])

  const sorted = [...rows].sort((a, b) => M.v(b) - M.v(a) || b.pop2020 - a.pop2020)
  let shown = showAll ? sorted : sorted.slice(0, 10)
  if (hl != null && !shown.some((b) => b.id === hl)) shown = shown.concat(sorted.filter((b) => b.id === hl))
  const vmx = Math.max(...rows.map(M.v)) || 1
  const top = num(ov.funnel[0]?.count)
  const popup = (b) => {
    const s = b.stats
    return `<b>${h(b.name)}</b><br>Population 2020: ${b.pop2020.toLocaleString()}` +
      (s ? `<br>Screened: ${h(sup(s.screened))} (${per1k(s.screenedPer1000)} per 1,000)<br>Higher risk: ${h(sup(s.higherRisk))} · referred: ${h(sup(s.referred))} · done: ${h(sup(s.completed))}` : '') +
      (b.near ? `<br>Nearest public YAKAP clinic: ${h(b.near.name)} (~${b.near.km.toFixed(1)} km)` : '')
  }

  return (
    <>
      <div className="kpis six">
        <div className="kpi lead">
          <div className="eyebrow">Screened with YAKAP labs</div>
          <div className="v">{sup(T.screened)}</div>
          <p>{per1k(T.screenedPer1000)} per 1,000 residents</p>
          <Spark weeks={ov.weeklyScreenings} />
        </div>
        <Kpi label="Came with a resident code" value={sup(T.cameWithResidentCode)} />
        <Kpi label="Higher risk" value={sup(T.higherRisk)} />
        <Kpi label="Referred for uACR" value={sup(T.referred)} text="doctor-approved" />
        <Kpi label="Referrals completed" value={T.completedShare == null ? '—' : pct(T.completedShare)} text={`${sup(T.completed)} results in`} />
        <Kpi label="uACR ≥30 found" value={sup(T.uacrPositive)} text="suspected, needs repeat" />
      </div>
      {ov.note && <p className="muted text-[12.5px] mt-2.5">{ov.note}</p>}

      <div className="cho-grid mt-3.5">
        <div className="card">
          <div className="flex justify-between gap-2.5 flex-wrap items-center">
            <div className="seg" role="group" aria-label="Map colour">
              {Object.entries(METRICS).map(([k, o]) => <button key={k} type="button" className={k === metric ? 'on' : undefined} aria-pressed={k === metric} onClick={() => setMetric(k)}>{o.label}</button>)}
            </div>
            <div className="seg" role="group" aria-label="Map background">
              {['outline', 'map', 'satellite'].map((k) => <button key={k} type="button" className={k === base ? 'on' : undefined} aria-pressed={k === base} onClick={() => setBase(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
            </div>
          </div>
          <CityMap rows={rows} cls={cls} popup={popup} highlight={hl} onPick={setHl} base={base} />
          <div className="legend">
            <span><b className="text-text font-semibold">{M.label}</b></span>
            <span className="scale" aria-hidden="true">
              <span style={{ border: '1px solid var(--line-2)' }} />{[1, 2, 3, 4].map((k) => <span key={k} style={{ background: `var(--ch${k})` }} />)}
            </span>
            <span className="mono">0 · &lt;{M.f(br[0])} · &lt;{M.f(br[1])} · &lt;{M.f(br[2])} · ≥{M.f(br[2])}</span>
          </div>
          <div className="legend">
            <span><i className="dot" style={{ background: '#2E9E62' }} />Public YAKAP clinic</span>
            <span><i className="dot" style={{ background: '#C98A1B' }} />Private YAKAP clinic</span>
            <span>Pins approximate · Screening reach, not CKD prevalence</span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center gap-2">
            <div className="eyebrow">Barangays · {M.label.toLowerCase()}</div>
            <button className="btn xs" onClick={() => setShowAll(!showAll)}>{showAll ? 'Top 10' : 'Show all 80'}</button>
          </div>
          <div className="tw mt-2">
            <table className="t">
              <thead><tr><th>Barangay</th><th className="num">{M.label}</th><th className="num">Screened</th><th className="num">Referred</th><th className="num">Done</th></tr></thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id} tabIndex={0} className={b.id === hl ? 'click hl' : 'click'} onClick={() => setHl(b.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHl(b.id) } }}>
                    <td>
                      <div>{b.name}</div>
                      <div className="hb grid-cols-1 pt-[3px] pb-0"><span className="tr"><i style={{ width: `${((100 * M.v(b)) / vmx).toFixed(1)}%` }} /></span></div>
                    </td>
                    <td className="num mono">{M.raw(b) == null ? '—' : M.f(M.raw(b))}</td>
                    <td className="num">{sup(b.stats?.screened)}</td>
                    <td className="num">{sup(b.stats?.referred)}</td>
                    <td className="num">{sup(b.stats?.completed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-xs mt-2">Click a barangay to find it on the map. Denominators: 2020 census.</p>
        </div>
      </div>

      <div className="cards2 mt-3.5">
        <div className="card">
          <div className="eyebrow">Referral funnel · last {ov.period} days</div>
          <div className="fun">
            {ov.funnel.map((f, i) => (
              <div key={f.step} className="fr">
                <span>{f.step}</span>
                <span className="fb"><i style={{ width: `${(top ? Math.max(1, (100 * num(f.count)) / top) : 0).toFixed(1)}%`, background: FUNNEL_COLOUR[i % FUNNEL_COLOUR.length] }} /></span>
                <span className="num mono">{sup(f.count)}</span>
              </div>
            ))}
          </div>
          {T.completedShare != null && <p className="muted text-[12.5px] mt-2.5">{pct(1 - T.completedShare)} of referrals have no result yet. Each YAKAP clinic sees its own as missed referrals after 14 days.</p>}
        </div>
        <div className="card">
          <div className="eyebrow">Outreach priorities · large population, low reach</div>
          <div className="prio mt-2.5">
            {ov.outreachPriorities.map((p) => (
              <div key={p.barangay.id} className="pr">
                <span className="n">{String(p.rank).padStart(2, '0')}</span>
                <span><b>{p.barangay.name}</b><small>{p.population2020.toLocaleString()} residents{p.nearestClinic && ` · nearest clinic ${p.nearestClinic.name}`}</small></span>
                <span className="mono text-[13px]">{per1k(p.screenedPer1000)}<small className="inline muted"> /1k</small></span>
              </div>
            ))}
          </div>
          <p className="muted text-[12.5px] mt-2.5">Barangays with many residents and the fewest screenings per 1,000. Candidates for barangay outreach or a screening day; a planning aid, not a measure of disease.</p>
        </div>
      </div>
    </>
  )
}

function Strategies() {
  const q = useApi(() => api.cityInsights.strategies())
  const s = q.data
  return (
    <div className="card mt-3.5">
      <div className="eyebrow">Planning · {s ? s.per : 'screening 1,000 adults'}</div>
      <Status q={q}>
        {s && (
          <>
            <div className="tw mt-2">
              <table className="t">
                <thead><tr><th>Strategy</th><th className="num">uACR tests</th><th className="num">Cases found</th><th className="num">Missed</th><th className="num">Test cost*</th><th className="num">Per case*</th></tr></thead>
                <tbody>
                  {s.rows.map((o) => (
                    <tr key={o.key}><td>{o.strategy}</td><td className="num">{Math.round(o.uacrTests)}</td><td className="num">{o.casesFound.toFixed(0)}</td><td className="num">{o.casesMissed.toFixed(0)}</td><td className="num">{peso(o.testCost)}</td><td className="num">{o.costPerCase == null ? '—' : peso(o.costPerCase)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted text-[12.5px] mt-2.5">
              *uACR price assumed at {peso(s.uacrPrice)}; it is not in the YAKAP benefit.
              {s.hemodialysisPerYear != null && ` One year of hemodialysis costs PhilHealth up to ${peso(s.hemodialysisPerYear)}.`} {s.note}
            </p>
          </>
        )}
      </Status>
    </div>
  )
}

function BudgetChart({ curve, n }) {
  const W = 460, H = 230, l = 36, b = 26, t = 10, r = 18
  const ymax = Math.max(25, Math.ceil(Math.max(...curve.map((o) => o.casesModel)) / 25) * 25)
  const X = (v) => l + (v / 1000) * (W - l - r), Y = (v) => H - b - (v / ymax) * (H - b - t)
  const line = (k, c, dash) => <path d={curve.map((o, i) => `${i ? 'L' : 'M'}${X(o.testsPer1000).toFixed(1)} ${Y(o[k]).toFixed(1)}`).join('')} fill="none" style={{ stroke: c }} strokeWidth="2.4" strokeDasharray={dash} />
  const at = curve.reduce((best, o) => (Math.abs(o.testsPer1000 - n) < Math.abs(best.testsPer1000 - n) ? o : best), curve[0])
  const mono = { fill: 'var(--muted)', fontFamily: 'JetBrains Mono,monospace' }
  const ticks = Array.from({ length: ymax / 25 + 1 }, (_, i) => i * 25)
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Cases found against tests per 1,000 adults: model ${at.casesModel.toFixed(1)}, rule ${at.casesRule.toFixed(1)} at ${n} tests`}>
        {ticks.map((v) => (
          <g key={v}><line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} style={{ stroke: 'var(--line)' }} /><text x={l - 6} y={Y(v) + 4} style={mono} fontSize="10" textAnchor="end">{v}</text></g>
        ))}
        {[0, 250, 500, 750, 1000].map((v) => <text key={v} x={X(v)} y={H - 8} style={mono} fontSize="10" textAnchor="middle">{v}</text>)}
        {line('casesRandom', 'var(--faint)', '4 4')}{line('casesRule', 'var(--mod)')}{line('casesModel', 'var(--accent)')}
        <line x1={X(n)} x2={X(n)} y1={t} y2={H - b} style={{ stroke: 'var(--text)' }} strokeDasharray="3 3" />
        <circle cx={X(n)} cy={Y(at.casesModel)} r="5" style={{ fill: 'var(--accent)' }} />
        <circle cx={X(n)} cy={Y(at.casesRule)} r="4" style={{ fill: 'var(--mod)' }} />
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />Model ranking</span>
        <span><i style={{ background: 'var(--mod)' }} />Diabetes / high BP first</span>
        <span><i style={{ background: 'var(--faint)' }} />No ranking</span>
      </div>
    </>
  )
}

// GET /city-insights/budget?tests=n gives the curve and the selected point; the slider waits a beat before asking
function Budget() {
  const [n, setN] = useState(490)
  const [asked, setAsked] = useState(490)
  useEffect(() => { const id = setTimeout(() => setAsked(n), 180); return () => clearTimeout(id) }, [n])
  const q = useApi(() => api.cityInsights.budget(asked), [asked])
  const d = q.data, o = d?.selected

  return (
    <div className="card mt-3.5">
      <div className="eyebrow">Target the cure · uACR test budget</div>
      <Status q={q}>
        {d && (
          <div className="bud mt-2.5">
            <div>
              <h3 className="text-[clamp(19px,2vw,26px)] font-medium tracking-[-.03em]">With <span className="mono text-accent">{n}</span> urine albumin tests per 1,000 adults with YAKAP labs, who goes first?</h3>
              <label className="sr-only" htmlFor="bud-r">uACR tests per 1,000 adults</label>
              <input type="range" className="rng" id="bud-r" min="10" max="1000" step="10" value={n} onChange={(e) => setN(+e.target.value)} />
              <div className="flex gap-1.5 flex-wrap">{[100, 200, d.ruleSharePer1000 ? Math.round(d.ruleSharePer1000 / 10) * 10 : 490, 1000].map((v, i) => <button key={i} className="btn xs" onClick={() => setN(v)}>{v}</button>)}</div>
              <div className="big3">
                <div><b className="text-accent">{o.casesModel.toFixed(1)}</b><span>cases found, model ranking</span></div>
                <div><b>{o.casesRule.toFixed(1)}</b><span>diabetes / high BP first</span></div>
                <div><b className="muted">{o.casesRandom.toFixed(1)}</b><span>no ranking</span></div>
              </div>
              <p className="mt-3 text-sm" aria-live="polite">
                {o.testsPer1000 >= 1000 ? `Testing everyone finds all ${o.casesModel.toFixed(1)} cases per 1,000; ranking makes no difference at this budget.`
                  : <>Same {o.testsPer1000} tests: the model's ranking finds <b>{o.extraVsRule >= 0 ? '+' : ''}{o.extraVsRule.toFixed(1)}</b> more cases per 1,000 than testing people with diabetes or high blood pressure first.</>}
                {' '}Test cost {peso(o.testCost)} per 1,000 adults (assumed {peso(d.uacrPrice)} each){o.costPerCaseModel != null ? `, ${peso(o.costPerCaseModel)} per case found by the model.` : '.'}
              </p>
            </div>
            <div>
              <BudgetChart curve={d.curve} n={n} />
              <p className="muted text-xs mt-1.5">
                Model {d.modelVersion}.{d.casesPer1000 != null && ` Cases of uACR ≥30 mg/g: ${d.casesPer1000.toFixed(1)} per 1,000 adults in the held-out test set.`}{d.source && ` Source: ${d.source}.`} With unlimited tests, testing everyone finds the most cases; ranking matters when tests are scarce.
              </p>
            </div>
          </div>
        )}
      </Status>
    </div>
  )
}
