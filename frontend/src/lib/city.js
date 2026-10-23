// Cagayan de Oro City data, as the prototype's City module.
// Barangay populations: PSA 2020 census. Clinics: the 42 providers on PhilHealth's YAKAP list (30 Sep 2026); the list has
// no building coordinates, so each pin is an APPROXIMATE point inside the barangay named in its address.
import GEO from '../data/cdo.json'

export const BARANGAYS = GEO.barangays.map((g) => ({ name: g.name, pop2020: g.pop2020, psgc: g.psgc, centre: g.centre, geometry: g.geometry }))
// order is fixed (PSGC order): the clinic code stores the index
export const NAMES = BARANGAYS.map((b) => b.name)
export const HAS_BOUNDARIES = BARANGAYS.some((b) => b.geometry)

export const CLINICS = GEO.clinics.map((c, i) => ({
  id: 'Y' + (i + 1), name: c.short, fullName: c.name, public: c.public, sector: c.public ? 'Public' : 'Private',
  tel: c.tel, address: c.address, brgy: c.brgy, lat: c.lat, lon: c.lon, until: c.accreditation_expiry, located: c.located,
}))

export function km(a, b) { // haversine, a and b are [lat, lon]
  const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const brgy = (name) => BARANGAYS.find((b) => b.name === name)

// all clinics sorted by straight-line distance from the barangay's centre
export function nearest(name) {
  const b = brgy(name)
  if (!b || !b.centre) return CLINICS.slice()
  return CLINICS.map((c) => ({ km: km(b.centre, [c.lat, c.lon]), ...c })).sort((x, y) => x.km - y.km)
}
