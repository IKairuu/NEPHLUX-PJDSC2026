import { create } from 'zustand'

// Staff access requests. The City Health Office verifies and invites, so there are no passwords here.
// Demo only: nothing typed is saved or sent; state lives in memory and is cleared when the page closes.
export const REGISTER_ROLES = ['doctor', 'bhw', 'cho']

const EMPTY = { name: '', prc: '', place: '', contact: '' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PH_MOBILE = /^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/

// names of the fields that fail, in form order
export function validate(role, f) {
  const bad = []
  if (f.name.trim().length < 3) bad.push('name')
  if (role === 'doctor' && !/^\d{7}$/.test(f.prc.trim())) bad.push('prc')
  if (!f.place) bad.push('place')
  const c = f.contact.trim()
  if (!(EMAIL.test(c) || (role === 'bhw' && PH_MOBILE.test(c)))) bad.push('contact')
  return bad
}

function errorMessage(role) {
  const middle = role === 'doctor' ? 'a 7-digit PRC number, your clinic, ' : role === 'bhw' ? 'your barangay, ' : 'your unit, '
  return 'Check the highlighted fields: your name, ' + middle + 'and a valid ' + (role === 'bhw' ? 'mobile number or email' : 'email') + '.'
}

export const useRegisterStore = create((set, get) => ({
  role: 'doctor',
  fields: EMPTY,
  errors: [],
  message: '',
  sent: false,

  // switching role keeps the name and contact but clears the role-specific fields
  setRole: (role) => set((s) => (s.role === role ? {} : { role, fields: { ...s.fields, prc: '', place: '' }, errors: [], message: '', sent: false })),
  setField: (key, value) => set((s) => ({ fields: { ...s.fields, [key]: value }, errors: s.errors.filter((k) => k !== key) })),

  submit: () => {
    const { role, fields } = get()
    const errors = validate(role, fields)
    if (errors.length) { set({ errors, message: errorMessage(role) }); return false }
    set({ errors: [], message: '', sent: true })
    return true
  },

  reset: () => set({ fields: EMPTY, errors: [], message: '', sent: false }),
}))
