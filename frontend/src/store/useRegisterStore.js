import { create } from 'zustand'
import { api } from '../lib/api'

// Staff access requests. The request goes to POST /access-requests; the City Health Office checks it,
// creates the account and emails the person. There are no passwords here.
export const REGISTER_ROLES = ['doctor', 'cho']

const EMPTY = { name: '', prc: '', place: '', contact: '' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// names of the fields that fail, in form order
export function validate(role, f) {
  const bad = []
  if (f.name.trim().length < 3) bad.push('name')
  if (role === 'doctor' && !/^\d{7}$/.test(f.prc.trim())) bad.push('prc')
  if (!f.place) bad.push('place')
  const c = f.contact.trim()
  if (!EMAIL.test(c)) bad.push('contact')
  return bad
}

function errorMessage(role) {
  return 'Check the highlighted fields: your name, ' + (role === 'doctor' ? 'a 7-digit PRC number, your clinic, ' : 'your unit, ') + 'and a valid email.'
}

// form fields -> the API body; place is the clinic's YAKAP ref (Y1..Y42) for doctors and the ChoUnit for CHO
function toRequest(role, f) {
  const base = { fullName: f.name.trim(), email: f.contact.trim().toLowerCase() }
  return role === 'doctor'
    ? { ...base, role: 'DOCTOR', prcLicenseNo: f.prc.trim(), clinicRef: f.place }
    : { ...base, role: 'CHO', choUnit: f.place }
}

export const useRegisterStore = create((set, get) => ({
  role: 'doctor',
  fields: EMPTY,
  errors: [],
  message: '',
  busy: false,
  sent: false,

  // switching role keeps the name and contact but clears the role-specific fields
  setRole: (role) => set((s) => (s.role === role ? {} : { role, fields: { ...s.fields, prc: '', place: '' }, errors: [], message: '', sent: false })),
  setField: (key, value) => set((s) => ({ fields: { ...s.fields, [key]: value }, errors: s.errors.filter((k) => k !== key) })),

  // resolves true once the request is stored
  submit: async () => {
    const { role, fields, busy } = get()
    if (busy) return false
    const errors = validate(role, fields)
    if (errors.length) { set({ errors, message: errorMessage(role) }); return false }
    set({ errors: [], message: '', busy: true })
    try {
      await api.accessRequests.create(toRequest(role, fields))
      set({ busy: false, sent: true })
      return true
    } catch (e) {
      // 409: this email already has an account or a request waiting
      set({ busy: false, message: e.message, errors: e.status === 409 ? ['contact'] : [] })
      return false
    }
  },

  reset: () => set({ fields: EMPTY, errors: [], message: '', busy: false, sent: false }),
}))
