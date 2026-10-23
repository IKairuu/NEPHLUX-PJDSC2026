import SectionHead from '../components/SectionHead'
import { ACCESS } from '../data/content'

export default function Access() {
  return (
    <section className="sec" id="access" aria-labelledby="aT">
      <div className="wrap">
        <SectionHead eyebrow="Access & sustainability" id="aT"
          title={<>No fees. <span className="serif">A research prototype.</span></>}
          text="NEPHLUX is not a PhilHealth service and is not endorsed by PhilHealth. It is designed to sit beside the YAKAP package the city already runs." />
        <div className="acc reveal">
          {ACCESS.map(([who, title, text]) => (
            <div key={who}><div className="who">{who}</div><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
      </div>
    </section>
  )
}
