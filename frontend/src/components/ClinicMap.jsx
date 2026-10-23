import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BARANGAYS, CLINICS, HAS_BOUNDARIES, brgy, nearest } from '../lib/city'
import { barangayList } from '../lib/api'
import { escapeHtml as h, titleCase } from '../lib/format'

// Only the map pictures load from the internet; nothing about the resident is sent.
const TILES = {
  outline: null,
  map: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors', max: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', max: 18 },
}

function popup(c, from) {
  const near = from ? nearest(from).find((x) => x.id === c.id) : null
  return '<div class="pop"><b style="font-size:13.5px">' + h(c.name) + '</b> <span class="pop-tag ' + (c.public ? 'pub">Public' : 'pri">Private') + '</span>' +
    '<div style="font-size:12.5px;margin-top:4px">' + (c.public ? 'YAKAP check-up free here.' : 'May charge up to ₱900 a year for YAKAP.') + '</div><dl>' +
    '<dt>Address</dt><dd>' + h(titleCase(c.address)) + '</dd><dt>Phone</dt><dd>' + h(String(c.tel || '—').replace(/\//g, ' / ')) + '</dd>' +
    (near ? '<dt>Distance</dt><dd>~' + near.km.toFixed(1) + ' km from ' + h(from) + '</dd>' : '') + '</dl>' +
    '<div style="color:var(--muted);font-size:11px;margin-top:5px">Bring your PhilHealth ID. Pin approximate; call ahead.</div></div>'
}

// from: the resident's barangay (highlighted, and used for distances); base: outline | map | satellite;
// focus: { id } of a clinic to open, a new object each time so the same clinic can be focused twice
export default function ClinicMap({ from, base, focus }) {
  const el = useRef(null), map = useRef(null), tiles = useRef(null), markers = useRef({})

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.25 })
    map.current = m
    const city = L.latLngBounds(CLINICS.map((c) => [c.lat, c.lon]))
    // barangay outlines: from the API (GET /barangays?includeBoundary=true), else from the local data file if it has them
    const drawOutlines = (rows) => {
      const fc = { type: 'FeatureCollection', features: rows.filter((b) => b.geometry).map((b) => ({ type: 'Feature', properties: { name: b.name }, geometry: b.geometry })) }
      if (!fc.features.length || map.current !== m) return
      L.geoJSON(fc, {
        style: (f) => (f.properties.name === from ? { color: '#E0505A', weight: 2.5, fillColor: '#E0505A', fillOpacity: 0.28 } : { color: '#B4485F', weight: 0.7, fillOpacity: 0.04 }),
        onEachFeature: (f, lyr) => lyr.bindTooltip(f.properties.name, { className: 'bl-label', direction: 'center', sticky: true }),
      }).addTo(m)
    }
    barangayList({ includeBoundary: true })
      .then((rows) => drawOutlines(rows.map((b) => ({ name: b.name, geometry: b.boundary }))))
      .catch(() => { if (HAS_BOUNDARIES) drawOutlines(BARANGAYS) })
    markers.current = {}
    for (const c of CLINICS) {
      markers.current[c.id] = L.marker([c.lat, c.lon], {
        icon: L.divIcon({ className: '', html: `<div class="pin ${c.public ? 'pub' : 'pri'}">+</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: c.name, keyboard: true,
      }).bindPopup(popup(c, from), { maxWidth: 250 }).addTo(m)
    }
    // frame the resident's barangay and its nearest clinics, or the whole city
    const b = from && brgy(from), near = from ? nearest(from) : []
    const view = b && near.length > 2 ? L.latLngBounds([b.centre, [near[0].lat, near[0].lon], [near[2].lat, near[2].lon]]).pad(0.6) : city
    m.fitBounds(view, { padding: [10, 10] })
    const t = setTimeout(() => { m.invalidateSize(); m.fitBounds(view, { padding: [10, 10] }) }, 80)
    return () => { clearTimeout(t); m.remove(); map.current = null; tiles.current = null }
  }, [from])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (tiles.current) m.removeLayer(tiles.current)
    const t = TILES[base]
    tiles.current = t ? L.tileLayer(t.url, { attribution: t.attr, maxZoom: t.max }).addTo(m) : null
  }, [base, from])

  useEffect(() => {
    const m = map.current, mk = focus && markers.current[focus.id]
    if (!m || !mk) return
    m.setView(mk.getLatLng(), Math.max(m.getZoom(), 14))
    mk.openPopup()
  }, [focus])

  return <div className="map" ref={el} role="region" aria-label="Map of YAKAP clinics in Cagayan de Oro" />
}
