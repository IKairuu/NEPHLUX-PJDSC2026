export const pct = (x, d = 0) => (100 * x).toFixed(d) + '%'
export const f3 = (x) => Number(x).toFixed(3)

// for the few places that build HTML strings (Leaflet popups)
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])

// "BRGY. LUMBIA" -> "Brgy. Lumbia"
export const titleCase = (x) => String(x || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bIi\b/g, 'II')
