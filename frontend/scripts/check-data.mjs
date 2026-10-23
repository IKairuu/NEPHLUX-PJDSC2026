// Sanity checks for the hand-copied city data, the risk engine and the clinic code. Run: npm run check:data
import { readFileSync } from 'node:fs'
import { score, level, bmiFrom } from '../src/lib/engine.js'
import { encode, decode, FLAGS } from '../src/lib/clinicCode.js'

const geo = JSON.parse(readFileSync(new URL('../src/data/cdo.json', import.meta.url), 'utf8'))
const names = geo.barangays.map((b) => b.name)
let failed = 0
function expect(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ' · ' + detail : ''}`)
  if (!ok) failed++
}

const pop = geo.barangays.reduce((s, b) => s + b.pop2020, 0)
expect('80 barangays', geo.barangays.length === 80, String(geo.barangays.length))
expect('barangay names are unique', new Set(names).size === names.length)
expect('2020 population totals 728,402 (PSA)', pop === 728402, pop.toLocaleString('en-US'))
expect('PSGC codes rise in file order', geo.barangays.every((b, i, a) => i === 0 || b.psgc > a[i - 1].psgc))
expect('42 clinics', geo.clinics.length === 42, String(geo.clinics.length))
const pub = geo.clinics.filter((c) => c.public).length
expect('29 public and 13 private clinics', pub === 29, `${pub} public`)
const missing = geo.clinics.filter((c) => !names.includes(c.brgy)).map((c) => c.brgy)
expect('every clinic barangay exists', missing.length === 0, missing.join(', '))

// Mang Ramon, the guided demo's fictional patient: the demo shows him as "higher chance"
const ramon = { age: 58, female: false, dm_hx: true, htn_hx: true, bp_med: false, cvd_hx: false, smoker: true, fam_dm: false, w: 72, ht: 165, brgy: 'Bonbon' }
const r = score({ ...ramon, bmi: bmiFrom(ramon.w, ramon.ht) }, 1)
expect('Mang Ramon scores "higher" at step 1', level(r.p, 1) === 'higher', `p = ${r.p.toFixed(4)}`)

const code = encode(ramon, names)
const back = decode(code, names)
const same = back.ok && ['age', 'w', 'ht', 'brgy', ...FLAGS].every((k) => back.a[k] === ramon[k])
expect('clinic code round-trips', same, code)
const typo = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0')
expect('a one-character typo is rejected', !decode(typo, names).ok, typo)

process.exitCode = failed ? 1 : 0
