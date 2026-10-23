// Nephra character art (v6): the Orb, a glass sphere with an orbit, in six emotions. Builds inline SVG markup;
// animation classes (nf-*) are styled in index.css.
let uid = 0

export const EMOTIONS = [
  { id: 'happy', name: 'Happy', use: 'Greeting, opening the chat' },
  { id: 'thinking', name: 'Thinking', use: 'Finding an answer, or a question it cannot answer' },
  { id: 'explaining', name: 'Explaining', use: 'Giving an answer about the app, YAKAP or CKD' },
  { id: 'concerned', name: 'Concerned', use: 'Medical or urgent questions: go to a doctor' },
  { id: 'celebrating', name: 'Celebrating', use: 'A step done, like getting a clinic code' },
  { id: 'sleepy', name: 'Sleepy', use: 'Idle, waiting for a question' },
]

// face: eyes centred on (cx, cy), scale s, ink colour, cheek colour, eye highlight
function face(cx, cy, s, emo, ink, cheek, hi) {
  const ex = 10.5 * s, my = cy + 10 * s, sw = 2.6 * s
  function eye(x) {
    if (emo === 'happy' || emo === 'celebrating') return `<path d="M${x - 4.6 * s} ${cy + 1.4 * s}Q${x} ${cy - 5 * s} ${x + 4.6 * s} ${cy + 1.4 * s}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`
    if (emo === 'sleepy') return `<path d="M${x - 4.6 * s} ${cy}Q${x} ${cy + 3.6 * s} ${x + 4.6 * s} ${cy}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`
    const dx = emo === 'thinking' ? 1.6 * s : 0, dy = emo === 'thinking' ? -1.6 * s : 0, ry = emo === 'concerned' ? 5.8 * s : 5.4 * s
    return `<g class="nf-eye"><ellipse cx="${x + dx}" cy="${cy + dy}" rx="${4.3 * s}" ry="${ry}" fill="${ink}"/><circle cx="${x + dx + 1.5 * s}" cy="${cy + dy - 2 * s}" r="${1.5 * s}" fill="${hi}"/></g>`
  }
  let o = eye(cx - ex) + eye(cx + ex)
  if (emo === 'concerned') o += `<path d="M${cx - ex - 5 * s} ${cy - 8 * s}L${cx - ex + 4 * s} ${cy - 11 * s}M${cx + ex + 5 * s} ${cy - 8 * s}L${cx + ex - 4 * s} ${cy - 11 * s}" stroke="${ink}" stroke-width="${2.2 * s}" stroke-linecap="round"/>`
  if (emo === 'thinking') o += `<path d="M${cx + ex - 5 * s} ${cy - 11 * s}Q${cx + ex} ${cy - 14 * s} ${cx + ex + 5 * s} ${cy - 11 * s}" fill="none" stroke="${ink}" stroke-width="${2.2 * s}" stroke-linecap="round"/>`
  if (emo === 'happy' || emo === 'celebrating' || emo === 'explaining') o += `<ellipse cx="${cx - ex - 3 * s}" cy="${my - 1 * s}" rx="${4 * s}" ry="${2.4 * s}" fill="${cheek}" opacity=".75"/><ellipse cx="${cx + ex + 3 * s}" cy="${my - 1 * s}" rx="${4 * s}" ry="${2.4 * s}" fill="${cheek}" opacity=".75"/>`
  const mouth = {
    happy: `<path d="M${cx - 6 * s} ${my}Q${cx} ${my + 6.5 * s} ${cx + 6 * s} ${my}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>`,
    explaining: `<g class="nf-talk"><path d="M${cx - 5.5 * s} ${my - 1 * s}Q${cx} ${my + 9 * s} ${cx + 5.5 * s} ${my - 1 * s}Z" fill="${ink}"/><path d="M${cx - 2.8 * s} ${my + 3.2 * s}Q${cx} ${my + 1.4 * s} ${cx + 2.8 * s} ${my + 3.2 * s}Q${cx} ${my + 5.6 * s} ${cx - 2.8 * s} ${my + 3.2 * s}Z" fill="#F27D90"/></g>`,
    celebrating: `<path d="M${cx - 8 * s} ${my - 1.5 * s}Q${cx} ${my + 12 * s} ${cx + 8 * s} ${my - 1.5 * s}Z" fill="${ink}"/><path d="M${cx - 4 * s} ${my + 4 * s}Q${cx} ${my + 2 * s} ${cx + 4 * s} ${my + 4 * s}Q${cx} ${my + 8 * s} ${cx - 4 * s} ${my + 4 * s}Z" fill="#F27D90"/>`,
    concerned: `<path d="M${cx - 5.5 * s} ${my + 2.5 * s}Q${cx - 2.7 * s} ${my - 1 * s} ${cx} ${my + 1.6 * s}Q${cx + 2.7 * s} ${my + 4.2 * s} ${cx + 5.5 * s} ${my + 1 * s}" fill="none" stroke="${ink}" stroke-width="${2.3 * s}" stroke-linecap="round"/>`,
    thinking: `<path d="M${cx - 4 * s} ${my + 1.8 * s}L${cx + 3.5 * s} ${my + 0.4 * s}" stroke="${ink}" stroke-width="${2.3 * s}" stroke-linecap="round"/>`,
    sleepy: `<ellipse cx="${cx}" cy="${my + 1.5 * s}" rx="${2.4 * s}" ry="${2.8 * s}" fill="none" stroke="${ink}" stroke-width="${2 * s}"/>`,
  }
  return o + mouth[emo]
}

// floating extras around the character (in the 120x120 box)
function extras(emo, col) {
  if (emo === 'thinking') return `<g class="nf-dots" fill="${col}"><circle cx="92" cy="24" r="3.2"/><circle cx="101" cy="17" r="2.4"/><circle cx="108" cy="11" r="1.7"/></g>`
  if (emo === 'concerned') return '<path class="nf-sweat" d="M95 30c3 5 4 7.5 4 9.4a4 4 0 0 1-8 0c0-1.9 1-4.4 4-9.4z" fill="#8FD0FF" stroke="#fff" stroke-opacity=".6"/>'
  if (emo === 'celebrating') return '<g class="nf-spark"><path d="M18 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#FFC857"/><path d="M100 16l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill="#F27D90"/><circle cx="106" cy="44" r="2.4" fill="#C9A2FF"/><circle cx="12" cy="48" r="2" fill="#6CCB94"/><rect x="24" y="8" width="5" height="3" rx="1" fill="#8FB6FF" transform="rotate(30 26 9)"/></g>'
  if (emo === 'explaining') return '<path class="nf-spark" d="M100 22l1.6 4.8 4.8 1.6-4.8 1.6-1.6 4.8-1.6-4.8-4.8-1.6 4.8-1.6z" fill="#FFC857"/>'
  if (emo === 'sleepy') return `<g class="nf-z" fill="${col}" font-family="Inter Tight,system-ui,sans-serif" font-weight="700"><text x="90" y="30" font-size="13">z</text><text x="100" y="19" font-size="9">z</text></g>`
  return ''
}

// title: '' (default) hides the picture from screen readers
export function faceSVG(emo = 'happy', { size = 120, title = '' } = {}) {
  const id = 'nf' + (++uid)
  const defs = `<radialGradient id="${id}r" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#FFC4CF"/><stop offset=".35" stop-color="#C2304C"/><stop offset=".75" stop-color="#5A0626"/><stop offset="1" stop-color="#200122"/></radialGradient>`
  const shadow = '<ellipse class="nf-shadow" cx="60" cy="111" rx="26" ry="4" fill="#200122" opacity=".22"/>'
  // the ring is drawn in two halves: the far half before the sphere (hidden behind it), the near half after
  const body = '<path class="nf-ring" d="M8 64A52 13 0 0 1 112 64" fill="none" stroke="#F27D90" stroke-opacity=".4" stroke-width="1.5" transform="rotate(-14 60 64)"/>' +
    `<circle cx="60" cy="62" r="38" fill="url(#${id}r)"/>` +
    '<ellipse cx="47" cy="40" rx="13" ry="7" fill="#fff" opacity=".35" transform="rotate(-25 47 40)"/><circle cx="60" cy="62" r="38" fill="none" stroke="#fff" stroke-opacity=".25"/>' +
    '<path class="nf-ring" d="M112 64A52 13 0 0 1 8 64" fill="none" stroke="#F7A3B2" stroke-opacity=".9" stroke-width="2" stroke-linecap="round" transform="rotate(-14 60 64)"/>'
  const label = title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'
  return `<svg class="nf nf-${emo}" viewBox="0 0 120 120" width="${size}" height="${size}"${label}>` +
    `<defs>${defs}</defs>${shadow}<g class="nf-body">${body}<g class="nf-face">${face(60, 60, 1, emo, '#fff', '#FF9AAE', '#3A0A3E')}</g></g>${extras(emo, '#C2304C')}</svg>`
}

// emotion for an answer: { id, scope: 'in' | 'off' | 'medical' }
export function forAnswer(r) {
  if (!r) return 'happy'
  if (r.scope === 'medical' || /emerg|urgent|danger/.test(r.id || '')) return 'concerned'
  if (r.scope === 'off') return 'thinking'
  if (/thank|bye|hello|greet/.test(r.id || '')) return 'celebrating'
  return 'explaining'
}
