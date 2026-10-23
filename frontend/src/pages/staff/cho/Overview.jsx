import { useMemo, useState } from 'react'
import Icon from '../../../components/Icon'
import { BUDGET, EV } from '../../../data/evidence'
import { barangayList } from '../../../lib/api'
import { CLINICS, km } from '../../../lib/city'
import { escapeHtml as h, pct } from '../../../lib/format'
import { useApi } from '../../../hooks/useApi'
import { Head, Kpi, Live, Status, peso } from '../ui'
import CityMap from './CityMap'

const PUBLIC = CLINICS.filter((c) => c.public)

// Per barangay: what the API holds (population, centre, outline) plus the nearest public YAKAP clinic from the clinic list
function enrich(rows) {
  return rows.map((b) => {
    let near = null
    if (b.centre) {
      for (const c of PUBLIC) {
        const d = km([b.centre.lat, b.centre.lon], [c.lat, c.lon])
        if (!near || d < near.km) near = { name: c.name, km: d }
      }
    }
    return { ...b, near, growth: b.pop2024 && b.pop2020 ? b.pop2024 / b.pop2020 - 1 : null }
  })
}

const METRICS = {
  pop: { label: 'Population 2020', v: (b) => b.pop2020, f: (v) => Math.round(v).toLocaleString() },
  far: { label: 'Km to a free clinic', v: (b) => b.near?.km ?? 0, f: (v) => v.toFixed(1) },
  growth: { label: 'Growth 2020–2024', v: (b) => b.growth ?? 0, f: (v) => pct(v, 1) },
}

function breaks(vals) { // 4 quantile classes over positive values; class 0 = none
  const nz = vals.filter((v) => v > 0).sort((a, b) => a - b)
  if (!nz.length) return [0, 0, 0]
  return [0.25, 0.5, 0.75].map((q) => nz[Math.min(nz.length - 1, Math.floor(q * nz.length))])
}
const classOf = (v, br) => (!(v > 0) ? 0 : v < br[0] ? 1 : v < br[1] ? 2 : v < br[2] ? 3 : 4)

export default function Overview() {
  const q = useApi(() => barangayList({ includeBoundary: true }))
  const rows = useMemo(() => (q.data ? enrich(q.data) : null), [q.data])
  const [metric, setMetric] = useState('pop')
  const [base, setBase] = useState('outline')
  const [hl, setHl] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const M = METRICS[metric]

  const br = useMemo(() => (rows ? breaks(rows.map(M.v)) : [0, 0, 0]), [rows, M])
  const cls = useMemo(() => (b) => classOf(M.v(b), br), [M, br])

  return (
    <>
      <Head eyebrow="City Health Office · Cagayan de Oro City" title={<>Where should screening <span className="serif">go</span>?</>}
        text="The 80 barangays and the 42 YAKAP clinics on PhilHealth's list. No names leave the clinics.">
        <Live>Barangays from the API</Live>
      </Head>
      <Status q={q}>
        {rows && <Body rows={rows} metric={metric} setMetric={setMetric} base={base} setBase={setBase} hl={hl} setHl={setHl} showAll={showAll} setShowAll={setShowAll} M={M} br={br} cls={cls} />}
      </Status>
    </>
  )
}

function Body({ rows, metric, setMetric, base, setBase, hl, setHl, showAll, setShowAll, M, br, cls }) {
  const pop = rows.reduce((s, b) => s + b.pop2020, 0)
  const far = rows.filter((b) => b.near && b.near.km > 5)
  const sorted = [...rows].sort((a, b) => M.v(b) - M.v(a) || b.pop2020 - a.pop2020)
  let shown = showAll ? sorted : sorted.slice(0, 10)
  if (hl != null && !shown.some((b) => b.id === hl)) shown = shown.concat(sorted.filter((b) => b.id === hl))
  const vmx = Math.max(...rows.map(M.v)) || 1
  const prio = rows.filter((b) => b.pop2020 >= 5000 && b.near).sort((a, b) => b.near.km - a.near.km).slice(0, 5)
  const popup = (b) => `<b>${h(b.name)}</b><br>Population 2020: ${b.pop2020.toLocaleString()}${b.pop2024 ? `<br>Population 2024: ${b.pop2024.toLocaleString()}` : ''}` +
    (b.near ? `<br>Nearest public YAKAP clinic: ${h(b.near.name)} (~${b.near.km.toFixed(1)} km)` : '')

  return (
    <>
      <div className="kpis five">
        <Kpi lead label="Residents" value={pop.toLocaleString()} text="2020 census, 80 barangays" />
        <Kpi label="YAKAP clinics" value={CLINICS.length} text={`${PUBLIC.length} public (free) · ${CLINICS.length - PUBLIC.length} private`} />
        <Kpi label="Over 5 km from a free clinic" value={far.length} text={`barangays · ${far.reduce((s, b) => s + b.pop2020, 0).toLocaleString()} residents`} />
        <Kpi label="Largest barangay" value={[...rows].sort((a, b) => b.pop2020 - a.pop2020)[0].name} text="by 2020 population" />
        <Kpi label="Screening reach" value="—" text="needs a city summary endpoint" />
      </div>

      <div className="note mt-3.5 text-[13px]">
        <Icon name="info" /> <b>Screening counts are not shown yet.</b> Screenings, referrals, completed uACR tests and reach per 1,000 residents need a city-level summary endpoint, which the backend does not have yet (assessment and referral data are kept per clinic). When it exists, counts of 1 to 4 should show as "&lt;5" and the map should read as screening reach, not prevalence.
      </div>

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
            <span>Pins approximate · distances are straight-line from the barangay centre</span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center gap-2">
            <div className="eyebrow">Barangays · {M.label.toLowerCase()}</div>
            <button className="btn xs" onClick={() => setShowAll(!showAll)}>{showAll ? 'Top 10' : 'Show all 80'}</button>
          </div>
          <div className="tw mt-2">
            <table className="t">
              <thead><tr><th>Barangay</th><th className="num">{M.label}</th><th className="num">Pop. 2020</th></tr></thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id} tabIndex={0} className={b.id === hl ? 'click hl' : 'click'} onClick={() => setHl(b.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHl(b.id) } }}>
                    <td>
                      <div>{b.name}</div>
                      <div className="hb grid-cols-1 pt-[3px] pb-0"><span className="tr"><i style={{ width: `${((100 * M.v(b)) / vmx).toFixed(1)}%` }} /></span></div>
                    </td>
                    <td className="num mono">{M.f(M.v(b))}</td>
                    <td className="num mono">{b.pop2020.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-xs mt-2">Click a barangay to find it on the map. Populations: PSA 2020 census (2024 where available).</p>
        </div>
      </div>

      <div className="cards2 mt-3.5">
        <div className="card">
          <div className="eyebrow">Outreach candidates · large population, far from a free clinic</div>
          <div className="grid gap-2 mt-2.5">
            {prio.map((b, i) => (
              <div key={b.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 items-center px-3 py-2.5 rounded-xl bg-surface-2 text-[13.5px]">
                <span className="mono text-accent text-xs">0{i + 1}</span>
                <span><b>{b.name}</b><small className="block muted text-xs">{b.pop2020.toLocaleString()} residents · nearest free clinic {b.near.name}</small></span>
                <span className="mono text-[13px]">~{b.near.km.toFixed(1)} km</span>
              </div>
            ))}
          </div>
          <p className="muted text-[12.5px] mt-2.5">Barangays with 5,000+ residents, farthest from a public YAKAP clinic. Candidates for a screening day; a planning aid, not a measure of disease. Once screening counts are available, low reach should drive this list instead.</p>
        </div>
        <Planning />
      </div>
      <Budget />
    </>
  )
}

function Planning() {
  const c = EV.cost_per_1000
  const rows = [['Test everyone', c.test_everyone_uacr], ['Rule: diabetes or high BP', c.rule_dm_or_htn], ['Model, same number of tests', c.step2_model_same_referrals], ['Two-step pathway', c.two_step_pathway_fixed_thresholds]]
  return (
    <div className="card">
      <div className="eyebrow">Planning · screening 1,000 adults (NHANES 2017–2020 rates)</div>
      <div className="tw mt-2">
        <table className="t">
          <thead><tr><th>Strategy</th><th className="num">uACR tests</th><th className="num">Found</th><th className="num">Missed</th><th className="num">Cost*</th><th className="num">Per case*</th></tr></thead>
          <tbody>
            {rows.map(([n, o]) => (
              <tr key={n}><td>{n}</td><td className="num">{Math.round(o.uacr_tests)}</td><td className="num">{o.cases_found.toFixed(0)}</td><td className="num">{o.cases_missed.toFixed(0)}</td><td className="num">{peso(o.cost_base)}</td><td className="num">{peso(o.cost_per_case_base)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted text-[12.5px] mt-2.5">*uACR price assumed at ₱600 (range ₱300–1,200); it is not in the YAKAP benefit. One year of hemodialysis costs PhilHealth up to {peso(EV.hd_per_year)} (₱6,350 × 156, Circular 2024-0023). Dialysis avoided was not measured.</p>
    </div>
  )
}

function BudgetChart({ n }) {
  const W = 460, H = 230, l = 36, b = 26, t = 10, r = 18
  const X = (v) => l + (v / 1000) * (W - l - r), Y = (v) => H - b - (v / 125) * (H - b - t)
  const line = (k, c, dash) => <path d={BUDGET.rows.map((o, i) => `${i ? 'L' : 'M'}${X(o.tests).toFixed(1)} ${Y(o[k]).toFixed(1)}`).join('')} fill="none" style={{ stroke: c }} strokeWidth="2.4" strokeDasharray={dash} />
  const at = BUDGET.rows[n / 10], mono = { fill: 'var(--muted)', fontFamily: 'JetBrains Mono,monospace' }
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Cases found against tests per 1,000 adults: model ${at.model.toFixed(1)}, rule ${at.rule.toFixed(1)} at ${n} tests`}>
        {[0, 25, 50, 75, 100, 125].map((v) => (
          <g key={v}><line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} style={{ stroke: 'var(--line)' }} /><text x={l - 6} y={Y(v) + 4} style={mono} fontSize="10" textAnchor="end">{v}</text></g>
        ))}
        {[0, 250, 500, 750, 1000].map((v) => <text key={v} x={X(v)} y={H - 8} style={mono} fontSize="10" textAnchor="middle">{v}</text>)}
        {line('random', 'var(--faint)', '4 4')}{line('rule', 'var(--mod)')}{line('model', 'var(--accent)')}
        <line x1={X(n)} x2={X(n)} y1={t} y2={H - b} style={{ stroke: 'var(--text)' }} strokeDasharray="3 3" />
        <circle cx={X(n)} cy={Y(at.model)} r="5" style={{ fill: 'var(--accent)' }} />
        <circle cx={X(n)} cy={Y(at.rule)} r="4" style={{ fill: 'var(--mod)' }} />
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />Model ranking</span>
        <span><i style={{ background: 'var(--mod)' }} />Diabetes / high BP first</span>
        <span><i style={{ background: 'var(--faint)' }} />No ranking</span>
      </div>
    </>
  )
}

function Budget() {
  const [n, setN] = useState(490)
  const o = BUDGET.rows[n / 10], cost = n * BUDGET.pricePeso, extra = o.model - o.rule
  return (
    <div className="card mt-3.5">
      <div className="eyebrow">Target the cure · uACR test budget</div>
      <div className="bud mt-2.5">
        <div>
          <h3 className="text-[clamp(19px,2vw,26px)] font-medium tracking-[-.03em]">With <span className="mono text-accent">{n}</span> urine albumin tests per 1,000 adults with YAKAP labs, who goes first?</h3>
          <label className="sr-only" htmlFor="bud-r">uACR tests per 1,000 adults</label>
          <input type="range" className="rng" id="bud-r" min="10" max="1000" step="10" value={n} onChange={(e) => setN(+e.target.value)} />
          <div className="flex gap-1.5 flex-wrap">{[100, 200, 490, 1000].map((v) => <button key={v} className="btn xs" onClick={() => setN(v)}>{v}</button>)}</div>
          <div className="big3">
            <div><b className="text-accent">{o.model.toFixed(1)}</b><span>cases found, model ranking</span></div>
            <div><b>{o.rule.toFixed(1)}</b><span>diabetes / high BP first</span></div>
            <div><b className="muted">{o.random.toFixed(1)}</b><span>no ranking</span></div>
          </div>
          <p className="mt-3 text-sm" aria-live="polite">
            {n >= 1000 ? `Testing everyone finds all ${o.model.toFixed(1)} cases per 1,000; ranking makes no difference at this budget.`
              : <>Same {n} tests: the model's ranking finds <b>{extra >= 0 ? '+' : ''}{extra.toFixed(1)}</b> more cases per 1,000 than testing people with diabetes or high blood pressure first.</>}
            {' '}Test cost {peso(cost)} per 1,000 adults (assumed ₱600 each){o.model > 0 ? `, ${peso(cost / o.model)} per case found by the model.` : '.'}
            {n === 490 && <span className="muted"> 490 is the rule's own share. In the 6,655-person test set this gain was +32 cases (95% CI +12 to +51).</span>}
          </p>
        </div>
        <div>
          <BudgetChart n={n} />
          <p className="muted text-xs mt-1.5">Cases of uACR ≥30 mg/g per 1,000 adults in the held-out NHANES 2017–March 2020 test set ({BUDGET.casesPer1000.toFixed(1)} per 1,000). With unlimited tests, testing everyone finds the most cases; ranking matters when tests are scarce.</p>
        </div>
      </div>
    </div>
  )
}
