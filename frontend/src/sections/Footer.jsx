import { BrandMark } from '../components/Icon'

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <a className="brand m-0 mb-2.5" href="#top"><BrandMark />NEPHLUX</a>
          <p>NEPHLUX: Machine Learning–Based Albuminuria Risk Stratification from PhilHealth YAKAP Labs for Early Kidney Damage. PJDSC 2026 Public Health Analytics.</p>
        </div>
        <p>Screening support, not a diagnosis. Step 2U (labs + dipstick) was learned and tested on Korean KNHANES data; Step 2 (labs only) on U.S. NHANES. Both have not been validated in Filipino patients. Patient records are SAMPLE data. Clinic pins are approximate. Not affiliated with or endorsed by PhilHealth.</p>
      </div>
    </footer>
  )
}
