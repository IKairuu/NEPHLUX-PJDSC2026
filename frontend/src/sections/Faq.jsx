import Icon from '../components/Icon'
import SectionHead from '../components/SectionHead'
import { FAQ } from '../data/content'
import { useGo } from '../hooks/useGo'

export default function Faq() {
  const navigate = useGo()
  return (
    <section className="sec" id="faq" aria-labelledby="qT">
      <div className="wrap faqgrid">
        <SectionHead eyebrow="FAQ" id="qT" title={<>Straight <span className="serif">answers.</span></>}
          text="Still unsure? Ask Nephra; it knows the app, YAKAP and the uACR test.">
          <button className="btn mt-[18px]" onClick={() => navigate('nephra')}><Icon name="chat" />Ask Nephra</button>
        </SectionHead>
        <div className="faq reveal">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  )
}
