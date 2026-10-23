// Resident clinic code (layout v4). Pure functions, no storage, no network.
// The code IS the resident's answers, packed into 9 characters with a check value, so
// nothing has to be saved: the resident shows the code, clinic staff type it in and
// confirm each answer with them. Must stay identical to the frontend encoder.
// Layout (45 bits): version 1 | age-20 7 | 7 yes/no answers | weight*2-50 9 | height-120 7 | barangay 7 | check 7

const ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U
const VERSION = 1;
const BRGY = 128;

export const CODE_FLAGS = [
  'female',
  'dmHx',
  'htnHx',
  'bpMed',
  'cvdHx',
  'smoker',
  'famDm',
] as const;

export type CodeFlag = (typeof CODE_FLAGS)[number];

export interface ClinicCodeAnswers extends Record<CodeFlag, boolean> {
  age: number;
  weightKg: number;
  heightCm: number;
  // barangays.code_index (1-80), or 0 when the resident did not give one
  barangayCodeIndex: number;
}

export type DecodeResult =
  { ok: true; answers: ClinicCodeAnswers } | { ok: false; error: string };

// weighted sum of the 38 data bits in 6-bit groups, mod 127
function check(v: number): number {
  let s = 0;
  let w = 1;
  for (let i = 0; i < 7; i++) {
    s += (Math.floor(v / Math.pow(2, 6 * i)) % 64) * w;
    w = (w * 7) % 127;
  }
  return s % 127;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function encodeClinicCode(a: ClinicCodeAnswers): string {
  let v = VERSION;
  v = v * 128 + clamp(Math.round(a.age) - 20, 0, 127);
  for (const k of CODE_FLAGS) v = v * 2 + (a[k] ? 1 : 0);
  v = v * 512 + clamp(Math.round(a.weightKg * 2) - 50, 0, 511);
  v = v * 128 + clamp(Math.round(a.heightCm) - 120, 0, 127);
  v = v * BRGY + clamp(a.barangayCodeIndex, 0, BRGY - 1);
  v = v * 128 + check(v);
  let s = '';
  for (let i = 0; i < 9; i++) {
    s = ABC[v % 32] + s;
    v = Math.floor(v / 32);
  }
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
}

export function decodeClinicCode(code: string): DecodeResult {
  const s = code
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (s.length !== 9) {
    return {
      ok: false,
      error: 'A clinic code has 9 letters and numbers, like 1AB-2CD-3EF.',
    };
  }
  let v = 0;
  for (const ch of s) {
    const d = ABC.indexOf(ch);
    if (d < 0) {
      return {
        ok: false,
        error: 'The code has a character that is not used in clinic codes.',
      };
    }
    v = v * 32 + d;
  }
  const chk = v % 128;
  v = Math.floor(v / 128);
  if (check(v) !== chk) {
    return {
      ok: false,
      error: 'This code does not check out. Ask the patient to read it again.',
    };
  }
  const barangayCodeIndex = v % BRGY;
  v = Math.floor(v / BRGY);
  const heightCm = (v % 128) + 120;
  v = Math.floor(v / 128);
  const weightKg = ((v % 512) + 50) / 2;
  v = Math.floor(v / 512);
  const flags = {} as Record<CodeFlag, boolean>;
  for (let j = CODE_FLAGS.length - 1; j >= 0; j--) {
    flags[CODE_FLAGS[j]] = v % 2 === 1;
    v = Math.floor(v / 2);
  }
  const age = (v % 128) + 20;
  v = Math.floor(v / 128);
  if (v !== VERSION) {
    return {
      ok: false,
      error: 'This code is from a different version of the check.',
    };
  }
  return {
    ok: true,
    answers: { age, ...flags, weightKg, heightCm, barangayCodeIndex },
  };
}
