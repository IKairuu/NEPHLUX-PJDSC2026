import SectionHead from '../components/SectionHead'
import { FAQ } from '../data/content'

export default function Faq() {
  return (
    <section className="sec" id="faq" aria-labelledby="qT">
      <div className="wrap">
        <SectionHead eyebrow="FAQ" id="qT" title={<>Straight <span className="serif">answers</span>.</>} />
        <div className="faq reveal">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  )
}
