import { BrandMark } from '../components/Icon'

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <a className="brand m-0 mb-2.5" href="#top"><BrandMark />NEPHLUX</a>
          <p>NEPHLUX: Machine Learning–Based Albuminuria Risk Stratification from PhilHealth YAKAP Labs for Early Kidney Damage. Prototype v6, PJDSC 2026 Public Health Analytics.</p>
        </div>
        <p>Screening support, not a diagnosis. The model was trained on U.S. NHANES 2011–2016 and tested on 2017–March 2020; it has not yet been validated in Filipino patients. Patient records are SAMPLE data. Clinic pins are approximate. Not affiliated with or endorsed by PhilHealth.</p>
      </div>
    </footer>
  )
}
