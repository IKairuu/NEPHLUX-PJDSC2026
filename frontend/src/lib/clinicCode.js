// Resident clinic code (v4), ported unchanged from the prototype (BagoCode). Pure functions, no storage, no network.
// The code IS the resident's answers, packed into 9 characters with a check value, so nothing has to be
// saved anywhere: the resident shows the code, clinic staff type it in and confirm each answer with them.
// Layout (45 bits): version 1 | age-20 7 | 7 yes/no answers | weight*2-50 9 | height-120 7 | barangay 7 | check 7
const ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32: no I, L, O, U
export const FLAGS = ['female', 'dm_hx', 'htn_hx', 'bp_med', 'cvd_hx', 'smoker', 'fam_dm']
const VERSION = 1, BRGY = 128

function check(v) { // weighted sum of the 38 data bits in 6-bit groups, mod 127
  let s = 0, w = 1
  for (let i = 0; i < 7; i++) { s += (Math.floor(v / Math.pow(2, 6 * i)) % 64) * w; w = (w * 7) % 127 }
  return s % 127
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))

// a: {age, female, dm_hx, ..., w (kg), ht (cm), brgy}; barangays: list of names (the index is stored)
export function encode(a, barangays) {
  let v = VERSION
  v = v * 128 + clamp(Math.round(a.age) - 20, 0, 127)
  FLAGS.forEach((k) => { v = v * 2 + (a[k] ? 1 : 0) })
  v = v * 512 + clamp(Math.round(a.w * 2) - 50, 0, 511)
  v = v * 128 + clamp(Math.round(a.ht) - 120, 0, 127)
  v = v * BRGY + (a.brgy ? barangays.indexOf(a.brgy) + 1 : 0)
  v = v * 128 + check(v)
  let s = ''
  for (let i = 0; i < 9; i++) { s = ABC[v % 32] + s; v = Math.floor(v / 32) }
  return s.slice(0, 3) + '-' + s.slice(3, 6) + '-' + s.slice(6)
}

export function decode(code, barangays) {
  const s = String(code || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  if (s.length !== 9) return { ok: false, error: 'A clinic code has 9 letters and numbers, like 1AB-2CD-3EF.' }
  let v = 0
  for (let i = 0; i < 9; i++) {
    const d = ABC.indexOf(s[i])
    if (d < 0) return { ok: false, error: 'The code has a character that is not used in clinic codes.' }
    v = v * 32 + d
  }
  const chk = v % 128; v = Math.floor(v / 128)
  if (check(v) !== chk) return { ok: false, error: 'This code does not check out. Ask the patient to read it again.' }
  const a = {}, b = v % BRGY; v = Math.floor(v / BRGY)
  a.ht = v % 128 + 120; v = Math.floor(v / 128)
  a.w = (v % 512 + 50) / 2; v = Math.floor(v / 512)
  for (let j = FLAGS.length - 1; j >= 0; j--) { a[FLAGS[j]] = v % 2 === 1; v = Math.floor(v / 2) }
  a.age = v % 128 + 20; v = Math.floor(v / 128)
  if (v !== VERSION) return { ok: false, error: 'This code is from a different version of the check.' }
  a.brgy = b > 0 ? (barangays[b - 1] || '') : ''
  a.bmi = a.w / Math.pow(a.ht / 100, 2)
  return { ok: true, a }
}
