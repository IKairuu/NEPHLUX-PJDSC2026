export const SECTIONS = [
  ['#features', 'Features'],
  ['#how', 'How it works'],
  ['#nephra', 'Nephra'],
  ['#impact', 'Impact'],
  ['#benefits', 'Benefits'],
  ['#faq', 'FAQ'],
]

// v6: no barangay health worker role; the YAKAP clinic that orders a uACR test follows it up
export const ROLE_KEYS = ['resident', 'doctor', 'cho']
export const ROLES = {
  resident: { name: 'Resident', icon: 'res', blurb: 'Two-minute awareness check. No account, nothing saved.' },
  // v7: a nurse or doctor enters the labs; only the doctor decides. `short` keeps role pickers and buttons readable.
  doctor: { name: 'YAKAP Clinic (nurse or doctor)', short: 'YAKAP Clinic', icon: 'doc', blurb: 'A nurse or doctor enters the YAKAP labs; the doctor decides the referral; the clinic follows it up.', email: 'doctor@demo.nephlux', demoName: 'Dr. A. Reyes' },
  cho: { name: 'City Health Office', short: 'CHO', icon: 'cho', blurb: 'Screening reach by barangay, test budget, outreach.', email: 'cho@demo.nephlux', demoName: 'CHO analyst' },
}

// Shown on the sign-in screen for the seeded demo accounts. It only works when the backend was seeded
// with SEED_DEMO_PASSWORD=demo-2026; real accounts never use it.
export const DEMO_PASSWORD = 'demo-2026'

export const BENEFITS = [
  { icon: 'res', role: 'Residents', q: 'Should I get my kidneys checked?', scene: 'res',
    items: ['Two minutes on a phone, in English, Bisaya or Tagalog', 'No account, no name, nothing saved or sent', 'A clinic code so the form is not filled in twice', 'The nearest YAKAP clinic, and which ones are free'] },
  { icon: 'doc', role: 'YAKAP clinics', q: 'Who needs the urine test first?', scene: 'doc',
    items: ['Uses labs YAKAP already pays for', 'Shows the top reasons, not a black box', 'Flags missing values instead of guessing', 'The doctor keeps the decision, and overrides need a reason', 'One follow-up list until every uACR result is in'] },
  { icon: 'cho', role: 'City Health Office', q: 'Where should the tests go?', scene: 'cho',
    items: ['Screening reach per 1,000 residents in 80 barangays', 'Referral completion, with cells under 5 hidden', 'A budget slider grounded in the test-set results', 'Outreach list: large population, low reach'] },
]

export const ACCESS = [
  ['Residents', 'Free to use', 'No account and no data kept. Works on a basic phone browser. The YAKAP check-up itself is free at public YAKAP clinics; private YAKAP clinics may charge up to ₱900 a year.'],
  ['YAKAP clinics', 'Part of the consult', 'Runs beside the YAKAP lab results the clinic already has, and the clinic follows up its own referrals. A real rollout needs clinic accounts and record keeping under the Data Privacy Act.'],
  ['City Health Office', 'Budget for uACR', 'uACR is not in the YAKAP benefit. The city decides how many tests it can fund; the slider shows who to test first. Price assumed ₱600 (₱300–1,200).'],
]

export const FAQ = [
  ['What is NEPHLUX?', 'A screening tool that helps decide who should get a urine albumin-creatinine ratio (uACR) test first, using the labs PhilHealth YAKAP already covers. It is set in Cagayan de Oro City.'],
  ['What does NEPHLUX actually do?', 'It runs a logistic regression model on age, history, blood pressure, HbA1c, creatinine, lipids and blood count, and estimates the chance of albuminuria (uACR ≥30 mg/g). The doctor sees that estimate, its top reasons and any missing data, and decides.'],
  ['Is NEPHLUX a diagnostic tool?', 'No. It is screening support. Only a doctor can diagnose kidney disease, usually with two raised uACR results over 3 months.'],
  ['Does it use the YAKAP urinalysis?', 'Yes, when it is done. The U.S. NHANES data has no dipstick, so NEPHLUX added Step 2U: the same labs plus the urine dipstick (protein, blood, glucose, specific gravity), learned from Korean KNHANES 2021–2024, which has both the dipstick and uACR. Tested once on Korean adults (KNHANES 2019–2020), it found more cases than referring everyone with diabetes, high BP or dipstick protein 1+. Without a dipstick result the app uses Step 2. A dipstick protein of 1+ or more still means refer whatever the score.'],
  ['What counts as high, moderate or low?', 'With the dipstick (Step 2U) there are two bands: refer at 2.5% or more, fixed on the Korean learning data so that it refers the same share as diabetes, high BP or dipstick 1+. Without the dipstick (Step 2): high is an estimated chance of 7.6% or more that uACR is 30 mg/g or higher; moderate is 4.5% to 7.6%; low is under 4.5%. About 12% of adults in the test set had albuminuria, so 7.6% is already well above many people. The high cut-off refers about the same share of adults as the diabetes-or-high-BP rule.'],
  ['What is the difference between the resident check and the clinic assessment?', 'The resident check uses 10 questions and no labs; it is awareness only and in testing did no better than asking about diabetes and high blood pressure. The clinic assessment adds YAKAP labs and measured blood pressure; that step passed its pre-registered pass mark.'],
  ['What is a uACR test?', 'A urine test that measures albumin, a protein that leaks into urine when the kidney filters are damaged. It shows damage earlier than creatinine. It is not part of the YAKAP benefit.'],
  ['Does NEPHLUX replace a doctor?', 'No. The doctor approves, overrides (with a written reason) or declines every suggested referral and is responsible for it.'],
  ['Does the system use real Philippine patient data?', 'No. Step 2 was trained and tested on U.S. NHANES survey data, and Step 2U on Korean KNHANES survey data. The 42 YAKAP clinics and the 80 barangay populations are real public data; clinic pins are approximate.'],
  ['Is the model validated in the Philippines?', 'Not yet. The models have not been validated in Filipino patients. They were tested on U.S. (NHANES) and Korean (KNHANES) adults; the next test needs Filipino YAKAP records.'],
  ['How does the City Health Office dashboard work?', 'It counts screenings, referrals and completed tests by barangay, per 1,000 residents (2020 census). This shows screening reach, not how common kidney disease is. Cells of 1 to 4 show as "<5".'],
  ['Is NEPHLUX connected to PhilHealth?', "No. It has no connection to PhilHealth systems and is not endorsed by PhilHealth. The clinic list comes from PhilHealth's public YAKAP list of 30 Sep 2026."],
  ['Can residents use NEPHLUX without laboratory results?', 'Yes. The resident check needs no labs and no account. It gives a clinic code to show at a YAKAP clinic, where the labs are done.'],
]

// titles of the 10 guided-demo steps (the demo itself is not part of the landing page)
export const DEMO_STEPS = [
  'Resident starts the check',
  'He answers 10 questions',
  'Awareness result and a clinic code',
  'He finds the nearest YAKAP clinic',
  'The doctor loads his code and enters labs',
  'The risk estimate appears',
  'She reviews the reasons and the data',
  'She approves and prints the slip',
  'The clinic sees a missed referral',
  'The city sees counts, not names',
]
