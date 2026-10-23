// The 10 resident questions. Bisaya and Tagalog are draft translations for review by native speakers.
export const LANGS = [['en', 'English'], ['ceb', 'Bisaya'], ['fil', 'Tagalog']]

// shown when the API can't be reached (ApiError status 0)
export const OFFLINE = {
  en: "Can't reach the NEPHLUX server. Check your connection and try again.",
  ceb: 'Dili makonektar sa NEPHLUX server. Susiha ang imong koneksyon ug sulayi pag-usab.',
  fil: 'Hindi maabot ang NEPHLUX server. Tingnan ang inyong koneksyon at subukang muli.',
}

// shown when the server answers with a 5xx error (for example, no active model yet)
export const UNAVAILABLE = {
  en: "The check isn't available right now. Please try again later, or ask at your YAKAP clinic.",
  ceb: 'Dili pa magamit ang check karon. Palihug sulayi pag-usab unya, o pangutana sa imong YAKAP clinic.',
  fil: 'Hindi pa magagamit ang check ngayon. Pakisubukang muli mamaya, o magtanong sa inyong YAKAP clinic.',
}

export const YES_NO = {
  yns: [['1', { en: 'Yes', ceb: 'Oo', fil: 'Oo' }], ['0', { en: 'No / not sure', ceb: 'Wala / dili sigurado', fil: 'Hindi / hindi sigurado' }]],
  yn: [['1', { en: 'Yes', ceb: 'Oo', fil: 'Oo' }], ['0', { en: 'No', ceb: 'Dili', fil: 'Hindi' }]],
}

export const QUESTIONS = [
  { k: 'age', type: 'num', q: { en: 'How old are you?', ceb: 'Pila na ang imong edad?', fil: 'Ilang taon na kayo?' } },
  { k: 'female', q: { en: 'Sex at birth', ceb: 'Sekso sa pagkatawo', fil: 'Kasarian sa kapanganakan' },
    opts: [['1', { en: 'Female', ceb: 'Babaye', fil: 'Babae' }], ['0', { en: 'Male', ceb: 'Lalaki', fil: 'Lalaki' }]] },
  { k: 'dm_hx', opts: 'yns', q: { en: 'Has a doctor ever told you that you have diabetes?', ceb: 'Gisultihan na ba ka sa doktor nga naa kay diabetes?', fil: 'Sinabihan na ba kayo ng doktor na may diabetes kayo?' } },
  { k: 'htn_hx', opts: 'yns', q: { en: 'Has a doctor ever told you that you have high blood pressure?', ceb: 'Gisultihan na ba ka sa doktor nga taas ang imong presyon?', fil: 'Sinabihan na ba kayo ng doktor na mataas ang presyon ninyo?' } },
  { k: 'bp_med', opts: 'yn', q: { en: 'Do you take medicine for blood pressure now?', ceb: 'Nag-inom ka ba karon og tambal sa presyon?', fil: 'Umiinom ba kayo ngayon ng gamot sa presyon?' } },
  { k: 'cvd_hx', opts: 'yn', q: { en: 'Have you ever had a heart attack, stroke or heart failure?', ceb: 'Na-heart attack, na-stroke o nag-heart failure na ba ka?', fil: 'Na-heart attack, na-stroke o nagka-heart failure na ba kayo?' } },
  { k: 'smoker', opts: 'yn', q: { en: 'Do you smoke cigarettes now?', ceb: 'Nanigarilyo ka ba karon?', fil: 'Naninigarilyo ba kayo ngayon?' } },
  { k: 'fam_dm', opts: 'yns', q: { en: 'Does a parent, brother or sister have diabetes?', ceb: 'Naa ba kay ginikanan o igsoon nga naay diabetes?', fil: 'May magulang o kapatid ba kayong may diabetes?' } },
  { k: 'wh', type: 'wh', q: { en: 'Your weight and height', ceb: 'Imong timbang ug gitas-on (puwede ang banabana)', fil: 'Timbang at taas (puwede ang tantiya)' } },
  { k: 'brgy', type: 'brgy', q: { en: 'Your barangay in Cagayan de Oro', ceb: 'Imong barangay sa Cagayan de Oro', fil: 'Ang barangay ninyo sa Cagayan de Oro' } },
]
