import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CLINICS } from '../../../lib/city'
import { escapeHtml as h } from '../../../lib/format'
import { useUIStore } from '../../../store/useUIStore'

const TILES = {
  outline: null,
  map: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors', max: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', max: 18 },
}

const chColor = (k) => getComputedStyle(document.documentElement).getPropertyValue('--ch' + k).trim()

// Barangay outlines from GET /barangays?includeBoundary=true, shaded by class(b) 0–4, with the YAKAP clinic pins.
// rows: barangays from the API; cls: (row) => 0..4; popup: (row) => HTML; highlight: barangay id; onPick: (id) => void
export default function CityMap({ rows, cls, popup, highlight, onPick, base }) {
  const el = useRef(null), map = useRef(null), geo = useRef(null), tiles = useRef(null)
  const theme = useUIStore((s) => s.theme)
  const live = useRef({}) // latest callbacks, so the map is built once per data set
  live.current = { cls, popup, onPick, highlight }

  const style = (f) => {
    const { cls: c, highlight: hl } = live.current
    const k = c(f.properties.row), lt = document.documentElement.getAttribute('data-theme') === 'light', on = f.properties.row.id === hl
    return {
      color: on ? (lt ? '#1D1219' : '#FFFFFF') : (lt ? 'rgba(111,0,0,.45)' : 'rgba(242,125,144,.45)'),
      weight: on ? 3 : 0.8, fillColor: k ? chColor(k) : (lt ? '#FFFFFF' : '#1A121C'), fillOpacity: k ? 0.85 : 0.35,
    }
  }

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, zoomSnap: 0.25 })
    map.current = m
    const fc = { type: 'FeatureCollection', features: rows.filter((b) => b.boundary).map((b) => ({ type: 'Feature', properties: { row: b }, geometry: b.boundary })) }
    geo.current = L.geoJSON(fc, {
      style,
      onEachFeature: (f, layer) => {
        layer.bindTooltip(f.properties.row.name, { className: 'bl-label', direction: 'center', sticky: true })
        layer.bindPopup(() => live.current.popup(f.properties.row))
        layer.on('click', () => live.current.onPick(f.properties.row.id))
      },
    }).addTo(m)
    for (const c of CLINICS) {
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({ className: '', html: `<div class="pin ${c.public ? 'pub' : 'pri'}">+</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: c.name, keyboard: true,
      }).bindPopup(`<div class="pop"><b>${h(c.name)}</b> <span class="pop-tag ${c.public ? 'pub">Public' : 'pri">Private'}</span><div style="font-size:12px;margin-top:4px">${h(c.brgy)} · pin approximate</div></div>`).addTo(m)
    }
    const bounds = fc.features.length ? geo.current.getBounds() : L.latLngBounds(CLINICS.map((c) => [c.lat, c.lon]))
    m.fitBounds(bounds, { padding: [10, 10] })
    const t = setTimeout(() => { m.invalidateSize(); m.fitBounds(bounds, { padding: [10, 10] }) }, 80)
    return () => { clearTimeout(t); m.remove(); map.current = null; tiles.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (tiles.current) m.removeLayer(tiles.current)
    const t = TILES[base]
    tiles.current = t ? L.tileLayer(t.url, { attribution: t.attr, maxZoom: t.max }).addTo(m) : null
  }, [base, rows])

  // restyle on a new highlight or theme; zoom to a barangay picked from the table
  useEffect(() => {
    if (!geo.current) return
    geo.current.setStyle(style)
    if (highlight == null) return
    geo.current.eachLayer((l) => { if (l.feature.properties.row.id === highlight && !map.current.getBounds().contains(l.getBounds())) map.current.fitBounds(l.getBounds().pad(1.2)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, theme, cls])

  return <div className="map tall" ref={el} role="region" aria-label="Map of Cagayan de Oro barangays" />
}
