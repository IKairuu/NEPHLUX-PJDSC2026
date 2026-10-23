import Icon from '../components/Icon'
import { DEMO_STEPS } from '../data/content'
import { useGo } from '../hooks/useGo'

export default function DemoCta() {
  const navigate = useGo()
  return (
    <section className="sec" id="demo-cta" aria-labelledby="dT">
      <div className="wrap">
        <div className="cta-band reveal">
          <div>
            <div className="eyebrow text-white/75">Guided demo · 10 steps · SAMPLE patient</div>
            <h2 id="dT">Follow Mang Ramon from a 10-question check to a uACR result.</h2>
            <p>A fictional 58-year-old from Bonbon. Every screen is the real app, signed in as demo users.</p>
            <button className="btn mt-5" onClick={() => navigate('demo')}><Icon name="play" />Start the guided demo</button>
          </div>
          <ol>{DEMO_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
        </div>
      </div>
    </section>
  )
}
