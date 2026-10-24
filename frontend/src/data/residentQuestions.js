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

// The result screen. headline, advice, reasons and disclaimer come from the API in English; these are the same texts
// in Bisaya and Tagalog, picked by result level and reason key. English always shows the server's own text.
export const RESULT = {
  title: { en: 'Your awareness result', ceb: 'Ang imong resulta', fil: 'Ang inyong resulta' },
  level: {
    higher: { en: 'Higher chance', ceb: 'Mas taas nga tsansa', fil: 'Mas mataas na tsansa' },
    lower: { en: 'Lower chance', ceb: 'Mas ubos nga tsansa', fil: 'Mas mababang tsansa' },
  },
  headline: {
    higher: {
      ceb: 'Ang imong mga tubag nagpakita nga mas taas ang tsansa nga adunay sayong kadaot sa kidney.',
      fil: 'Ipinapakita ng inyong mga sagot na mas mataas ang tsansa ng maagang pinsala sa kidney.',
    },
    lower: {
      ceb: 'Ang imong mga tubag nagpakita nga mas ubos ang tsansa nga adunay sayong kadaot sa kidney.',
      fil: 'Ipinapakita ng inyong mga sagot na mas mababa ang tsansa ng maagang pinsala sa kidney.',
    },
  },
  advice: {
    higher: {
      ceb: 'Dili kini diagnosis. Nagpasabot kini nga kinahanglan tan-awon sa doktor ang imong kidney. Pag-book og YAKAP check-up (libre sa mga public clinic) ug pangutana bahin sa mga kidney test.',
      fil: 'Hindi ito diagnosis. Ibig sabihin nito ay dapat ipatingin sa doktor ang inyong kidney. Mag-book ng YAKAP check-up (libre sa mga public clinic) at magtanong tungkol sa mga kidney test.',
    },
    lower: {
      ceb: 'Dili kini diagnosis, ug ang ubos nga tsansa dili nagpasabot nga wala gyud. Ang tinuig nga YAKAP check-up (libre sa mga public clinic) mao gihapon ang labing maayong paagi aron makit-an og sayo ang problema.',
      fil: 'Hindi ito diagnosis, at ang mababang tsansa ay hindi nangangahulugang wala na. Ang taunang YAKAP check-up (libre sa mga public clinic) pa rin ang pinakamabuting paraan para maagang makita ang problema.',
    },
  },
  // the phrase shown in bold inside the advice
  adviceBold: { en: 'YAKAP check-up (free at public clinics)', ceb: 'YAKAP check-up (libre sa mga public clinic)', fil: 'YAKAP check-up (libre sa mga public clinic)' },
  layers: {
    en: [['1 · This check', 'Awareness only'], ['2 · YAKAP labs', 'Doctor estimates risk'], ['3 · Diagnosis', 'Only a doctor, with repeat urine tests']],
    ceb: [['1 · Kini nga check', 'Pahibalo lang'], ['2 · YAKAP labs', 'Ang doktor ang mobanabana sa risgo'], ['3 · Diagnosis', 'Doktor lang, uban ang balik-balik nga urine test']],
    fil: [['1 · Ang check na ito', 'Para sa kaalaman lang'], ['2 · YAKAP labs', 'Tinatantiya ng doktor ang panganib'], ['3 · Diagnosis', 'Doktor lang, sa paulit-ulit na urine test']],
  },
  layersLabel: { en: 'Where you are in the pathway', ceb: 'Asa ka na sa proseso', fil: 'Nasaan na kayo sa proseso' },
  raised: { en: 'What raised your result', ceb: 'Unsa ang nagpataas sa imong resulta', fil: 'Ano ang nagpataas sa inyong resulta' },
  // [yes text, "no" text] per answer key; the server says "No …" or "Not …" when a "no" answer raised the result
  reasons: {
    age: { ceb: ['Edad'], fil: ['Edad'] },
    female: { ceb: ['Babaye', 'Lalaki'], fil: ['Babae', 'Lalaki'] },
    dm_hx: { ceb: ['Diagnosis sa diabetes', 'Walay diagnosis sa diabetes'], fil: ['Diagnosis ng diabetes', 'Walang diagnosis ng diabetes'] },
    htn_hx: { ceb: ['Diagnosis sa taas nga presyon', 'Walay diagnosis sa taas nga presyon'], fil: ['Diagnosis ng mataas na presyon', 'Walang diagnosis ng mataas na presyon'] },
    bp_med: { ceb: ['Tambal sa presyon', 'Walay tambal sa presyon'], fil: ['Gamot sa presyon', 'Walang gamot sa presyon'] },
    smoker: { ceb: ['Panigarilyo', 'Dili manigarilyo'], fil: ['Paninigarilyo', 'Hindi naninigarilyo'] },
    fam_dm: { ceb: ['Diabetes sa pamilya', 'Walay diabetes sa pamilya'], fil: ['Diabetes sa pamilya', 'Walang diabetes sa pamilya'] },
    cvd_hx: { ceb: ['Nakaagi og heart attack, stroke o heart failure', 'Wala pa makaagi og heart attack, stroke o heart failure'], fil: ['Nagkaroon ng heart attack, stroke o heart failure', 'Hindi pa nagkaroon ng heart attack, stroke o heart failure'] },
    bmi: { ceb: ['Body-mass index'], fil: ['Body-mass index'] },
  },
  codeTitle: { en: 'Your clinic code', ceb: 'Imong clinic code', fil: 'Ang inyong clinic code' },
  codeText: {
    en: 'Show this code at the YAKAP clinic. Staff type it in and check each answer with you. The code is your answers written short; it is not saved anywhere. Take a photo or write it down.',
    ceb: 'Ipakita kini nga code sa YAKAP clinic. I-type kini sa staff ug susihon uban kanimo ang matag tubag. Ang code mao ang imong mga tubag nga gipamubo; wala kini gi-save bisan asa. Kuhai og litrato o isulat.',
    fil: 'Ipakita ang code na ito sa YAKAP clinic. Ita-type ito ng staff at susuriin kasama ninyo ang bawat sagot. Ang code ay ang inyong mga sagot sa maikling anyo; hindi ito naka-save kahit saan. Kunan ng litrato o isulat.',
  },
  codeSummary: { en: 'What the code contains', ceb: 'Unsa ang sulod sa code', fil: 'Ano ang laman ng code' },
  codeContains: {
    en: (a, b) => `Age ${a.age} · ${a.female ? 'female' : 'male'} · ${a.w} kg · ${a.ht} cm · ${b || 'no barangay'} · your 6 yes/no answers. No name, no phone number.`,
    ceb: (a, b) => `Edad ${a.age} · ${a.female ? 'babaye' : 'lalaki'} · ${a.w} kg · ${a.ht} cm · ${b || 'walay barangay'} · ang imong 6 ka oo/dili nga tubag. Walay ngalan, walay numero sa telepono.`,
    fil: (a, b) => `Edad ${a.age} · ${a.female ? 'babae' : 'lalaki'} · ${a.w} kg · ${a.ht} cm · ${b || 'walang barangay'} · ang inyong 6 na oo/hindi na sagot. Walang pangalan, walang numero ng telepono.`,
  },
  disclaimer: {
    ceb: 'Kini nga check para lang sa pahibalo ug dili diagnosis. Sa pagsulay, ang mga pangutana lang wala nahimong mas maayo kaysa pagpangutana bahin sa diabetes ug presyon sa dugo, busa ang YAKAP clinic, uban ang imong lab tests, ang modesisyon kinsa ang ma-urine test. Gihimo gikan sa datos sa survey sa U.S.; wala pa nasulayan sa mga pasyenteng Pilipino. Walay gi-save sa imong gisulod.',
    fil: 'Ang check na ito ay para sa kaalaman lamang at hindi diagnosis. Sa pagsubok, ang mga tanong lang ay hindi naging mas mahusay kaysa sa pagtatanong tungkol sa diabetes at presyon ng dugo, kaya ang YAKAP clinic, kasama ang inyong lab tests, ang magpapasya kung sino ang sasailalim sa urine test. Ginawa mula sa datos ng survey sa U.S.; hindi pa nasusubok sa mga pasyenteng Pilipino. Walang na-save sa inyong inilagay.',
  },
  clear: { en: 'Clear my answers', ceb: 'Papasa ang akong mga tubag', fil: 'Burahin ang aking mga sagot' },
  askNephra: { en: 'Questions? Ask Nephra', ceb: 'May pangutana? Pangutana kang Nephra', fil: 'May tanong? Magtanong kay Nephra' },
  working: { en: 'Working out your result…', ceb: 'Gikuwenta ang imong resulta…', fil: 'Kinukuwenta ang inyong resulta…' },
  back: { en: 'Back', ceb: 'Balik', fil: 'Bumalik' },
  tryAgain: { en: 'Try again', ceb: 'Sulayi pag-usab', fil: 'Subukang muli' },
  next: { en: 'Next step · a YAKAP check-up', ceb: 'Sunod nga lakang · YAKAP check-up', fil: 'Susunod na hakbang · YAKAP check-up' },
  nearestTo: {
    en: (b) => `Nearest YAKAP clinics to ${b}`,
    ceb: (b) => `Pinakaduol nga YAKAP clinic sa ${b}`,
    fil: (b) => `Pinakamalapit na YAKAP clinic sa ${b}`,
  },
  chooseBrgy: { en: 'Choose your barangay to see the nearest clinics', ceb: 'Pilia ang imong barangay aron makita ang pinakaduol nga mga clinic', fil: 'Piliin ang inyong barangay para makita ang pinakamalapit na clinic' },
  choosePlaceholder: { en: 'Choose your barangay', ceb: 'Pilia ang imong barangay', fil: 'Piliin ang inyong barangay' },
  bring: {
    en: 'Bring your PhilHealth ID or number. YAKAP services are free at public YAKAP clinics; a private YAKAP clinic may charge up to ₱900 a year in total (PhilHealth Advisory 2026-0003).',
    ceb: 'Dad-a ang imong PhilHealth ID o numero. Libre ang serbisyo sa YAKAP sa mga public YAKAP clinic; ang pribadong YAKAP clinic mahimong maningil hangtod ₱900 sa usa ka tuig (PhilHealth Advisory 2026-0003).',
    fil: 'Dalhin ang inyong PhilHealth ID o numero. Libre ang serbisyo ng YAKAP sa mga public YAKAP clinic; ang pribadong YAKAP clinic ay maaaring maningil ng hanggang ₱900 bawat taon (PhilHealth Advisory 2026-0003).',
  },
  pub: { en: 'Public · YAKAP check-up free', ceb: 'Public · libre ang YAKAP check-up', fil: 'Public · libre ang YAKAP check-up' },
  pri: { en: 'Private · may charge up to ₱900 a year', ceb: 'Pribado · mahimong maningil hangtod ₱900 sa usa ka tuig', fil: 'Pribado · maaaring maningil ng hanggang ₱900 bawat taon' },
  nearestPublic: { en: 'nearest public clinic', ceb: 'pinakaduol nga public clinic', fil: 'pinakamalapit na public clinic' },
  showMap: { en: 'Show on map', ceb: 'Ipakita sa mapa', fil: 'Ipakita sa mapa' },
  bases: { en: ['Outline', 'Map', 'Satellite'], ceb: ['Outline', 'Mapa', 'Satellite'], fil: ['Outline', 'Mapa', 'Satellite'] },
  mapLabel: { en: 'Map background', ceb: 'Background sa mapa', fil: 'Background ng mapa' },
  legendPub: { en: 'Public: YAKAP check-up free', ceb: 'Public: libre ang YAKAP check-up', fil: 'Public: libre ang YAKAP check-up' },
  legendPri: { en: 'Private: up to ₱900 a year', ceb: 'Pribado: hangtod ₱900 sa usa ka tuig', fil: 'Pribado: hanggang ₱900 bawat taon' },
  mapNote: {
    en: 'Clinics: PhilHealth YAKAP list, 30 Sep 2026. Pins are approximate (barangay level). Map pictures load from the internet. Your answers went to the NEPHLUX server only to work out this result; it keeps none of them.',
    ceb: 'Mga clinic: listahan sa PhilHealth YAKAP, 30 Sep 2026. Banabana lang ang mga pin (lebel sa barangay). Ang mga hulagway sa mapa gikan sa internet. Ang imong mga tubag gipadala sa NEPHLUX server aron lang makuwenta kini nga resulta; wala kini magtipig bisan usa.',
    fil: 'Mga clinic: listahan ng PhilHealth YAKAP, 30 Sep 2026. Tantiya lang ang mga pin (antas ng barangay). Galing sa internet ang mga larawan ng mapa. Ipinadala ang inyong mga sagot sa NEPHLUX server para lang makuwenta ang resultang ito; wala itong itinatago kahit isa.',
  },
}
