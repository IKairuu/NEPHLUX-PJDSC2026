// Copies the full Cagayan de Oro data (barangay boundaries included) out of a prototype HTML file into src/data/cdo.json.
// Usage: npm run extract:cdo -- ../prototype/NEPHLUX_Prototype_v6.html
import { readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2]
if (!src) {
  console.error('Usage: npm run extract:cdo -- <path to NEPHLUX_Prototype_*.html>')
  process.exit(1)
}
const html = readFileSync(src, 'utf8')
const m = html.match(/var GEO = (\{.*?\});\n/s)
if (!m) {
  console.error('Could not find "var GEO = {...};" in ' + src)
  process.exit(1)
}
const geo = JSON.parse(m[1])
const out = new URL('../src/data/cdo.json', import.meta.url)
writeFileSync(out, JSON.stringify(geo) + '\n')
const withShapes = geo.barangays.filter((b) => b.geometry).length
console.log(`Wrote ${geo.barangays.length} barangays (${withShapes} with boundaries) and ${geo.clinics.length} clinics to src/data/cdo.json`)
console.log('Now run: npm run check:data')
