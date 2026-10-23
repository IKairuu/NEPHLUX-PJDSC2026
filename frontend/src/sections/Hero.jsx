import Icon from '../components/Icon'
import { useGo } from '../hooks/useGo'

const KIDNEY = 'M300 120c-92 0-150 78-150 178 0 108 62 182 150 182 54 0 78-30 78-74v-30c0-34-34-44-34-74s34-38 34-72v-36c0-44-24-74-78-74z'
const URETER = 'M378 330c40 0 64 14 90 40s40 70 40 120'
// [class, path, colour, opacity, width]
const FLOWS = [
  ['flow', 'M180 200c40 30 90 30 130 10s80-10 110 20', '#FFB8C4', '.55', '2'],
  ['flow s', 'M160 260c50 20 100 40 150 20s70-30 120 0', '#FFD7DE', '.45', '1.6'],
  ['flow r', 'M165 320c45 10 95 40 140 25s80-20 125 10', '#C9A2FF', '.5', '1.6'],
  ['flow s r', 'M180 390c40-10 90 20 130 10s70-30 110-5', '#FFB8C4', '.45', '2'],
  ['flow', 'M200 440c30-20 70-10 100 0s60 0 90-20', '#FFD7DE', '.35', '1.4'],
]

function Kidney() {
  return (
    <svg className="kid" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#200122" /><stop offset="1" stopColor="#6F0000" /></linearGradient>
        <linearGradient id="kg2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#6F0000" stopOpacity=".9" /><stop offset="1" stopColor="#C9A2FF" stopOpacity=".9" /></linearGradient>
        <radialGradient id="kglow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFB8C4" stopOpacity=".55" /><stop offset="1" stopColor="#FFB8C4" stopOpacity="0" /></radialGradient>
        <radialGradient id="kshine" cx=".3" cy=".22" r=".6"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <clipPath id="kclip"><path d={KIDNEY} /></clipPath>
      </defs>
      <circle cx="300" cy="300" r="250" fill="url(#kglow)" />
      <g className="orbit">
        <circle cx="300" cy="300" r="262" fill="none" stroke="#6F0000" strokeOpacity=".18" strokeDasharray="2 10" />
        <circle cx="300" cy="38" r="5" fill="#6F0000" /><circle cx="562" cy="300" r="3.5" fill="#200122" />
      </g>
      <g className="orbit b">
        <circle cx="300" cy="300" r="222" fill="none" stroke="#200122" strokeOpacity=".14" />
        <circle cx="78" cy="300" r="4" fill="#C9A2FF" /><circle cx="300" cy="522" r="3" fill="#6F0000" />
      </g>
      <g className="breathe">
        <path d={KIDNEY} fill="url(#kg)" />
        <g clipPath="url(#kclip)" fill="none" strokeLinecap="round">
          {FLOWS.map(([cls, d, c, o, w]) => <path key={d} className={cls} d={d} stroke={c} strokeOpacity={o} strokeWidth={w} />)}
        </g>
        <path d={KIDNEY} fill="url(#kshine)" />
        <path d={KIDNEY} fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1.5" />
      </g>
      <path className="flow s" d={URETER} fill="none" stroke="url(#kg2)" strokeWidth="3" strokeLinecap="round" />
      <path d={URETER} fill="none" stroke="#6F0000" strokeOpacity=".12" strokeWidth="10" strokeLinecap="round" />
      <g fill="#fff">
        <circle className="pulse" cx="246" cy="232" r="3" />
        <circle className="pulse" cx="282" cy="352" r="2.6" style={{ animationDelay: '-1.2s' }} />
        <circle className="pulse" cx="230" cy="300" r="2.2" style={{ animationDelay: '-2s' }} />
      </g>
    </svg>
  )
}

export function Aurora() {
  return <div className="aurora" aria-hidden="true"><i className="a1" /><i className="a2" /><i className="a3" /></div>
}

export default function Hero() {
  const navigate = useGo()
  return (
    <section className="hero" id="top" aria-labelledby="heroTitle">
      <Aurora />
      <div className="wrap">
        <div>
          <span className="kick glass-l"><b>RESEARCH PROTOTYPE</b>Cagayan de Oro City · PhilHealth YAKAP labs</span>
          <h1 id="heroTitle">Smarter screening for <span className="serif">early</span> kidney damage.</h1>
          <p className="lede">YAKAP already covers HbA1c, creatinine, lipids, a blood count and a urinalysis. It does not cover the urine albumin test (uACR) that shows kidney damage early. NEPHLUX uses the labs YAKAP already pays for to help the doctor decide who should get that test first.</p>
          <div className="ctas">
            <button className="btn primary" onClick={() => navigate('resident')}><Icon name="arrow" />Start the 2-minute check</button>
            <button className="btn glass-l" onClick={() => navigate('demo')}><Icon name="play" />Watch the guided demo</button>
          </div>
          <p className="hnote">Screening support, not a diagnosis. Trained on U.S. NHANES data; not yet validated in Filipino patients.</p>
        </div>
        <div className="stage" aria-hidden="true">
          <Kidney />
          <div className="float glass-l f1">
            <div className="fh">Step 1 · resident check <span className="dtag">DEMO</span></div>
            <div className="fv"><span className="dot" style={{ background: '#B23A26' }} />Higher chance</div>
            <div className="fs">Awareness only · clinic code given</div>
          </div>
          <div className="float glass-l f2">
            <div className="fh">Step 2 · YAKAP labs <span className="dtag">DEMO</span></div>
            <div className="fv">uACR referral</div>
            <div className="fs">Doctor approved · slip printed</div>
          </div>
          <div className="float glass-l f3">
            <div className="fh">City Health Office <span className="dtag">DEMO</span></div>
            <div className="fv"><span className="mono">80</span> barangays</div>
            <div className="fs">Screening reach, not prevalence</div>
          </div>
        </div>
      </div>
    </section>
  )
}
