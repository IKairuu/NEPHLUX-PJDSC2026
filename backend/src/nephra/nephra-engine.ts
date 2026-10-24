// Nephra's deterministic layer, ported from prototype v7 (Nephra v1.2).
// It runs before any language model: the safety filters decide danger signs,
// diagnosis, medicine and calculation questions on their own, and the BM25
// matcher picks the approved answers the model is allowed to use.
// Pure functions: no storage, no network, nothing logged.
import { NEPHRA_BANK, NephraIntent, NephraLink } from './nephra-bank';

export type NephraRole = 'guest' | 'resident' | 'doctor' | 'cho' | 'bhw';

export type FixedId =
  | 'safety_danger'
  | 'safety_selfharm'
  | 'refuse_diagnosis'
  | 'refuse_values'
  | 'refuse_medicine'
  | 'refuse_symptom'
  | 'refuse_calc'
  | 'refuse_off'
  | 'fallback_domain'
  | 'did_you_mean'
  | 'empty';

export type Scope = 'in' | 'medical' | 'off';

export interface EngineAnswer {
  id: string;
  text: string;
  scope: Scope;
  links: NephraLink[];
  suggest?: string[];
  score?: number;
}

export interface Ranked {
  id: string;
  score: number;
  cover: number;
}

interface FixedAnswer {
  scope: Scope;
  links: NephraLink[];
  text: string;
}

const CLINICS: NephraLink = { label: 'Find a clinic', go: 'clinics' };

// ------------------------------------------------------------ fixed safety answers
const FIXED: Record<Exclude<FixedId, 'refuse_calc'>, FixedAnswer> = {
  safety_danger: {
    scope: 'medical',
    links: [],
    text: "This could be an emergency. Go to the nearest hospital emergency room now, or call 911.\n\nDon't wait for a check-up or for this app.",
  },
  safety_selfharm: {
    scope: 'medical',
    links: [],
    text: "I'm sorry you're going through this, and you don't have to face it alone. Please call the NCMH crisis hotline at 1553 or 0917-899-8727, or call 911 or go to the nearest emergency room now.\n\nIf you can, tell someone you trust right away.",
  },
  refuse_diagnosis: {
    scope: 'medical',
    links: [CLINICS],
    text: "I can't say whether there is kidney disease, what stage it is, or what will happen; only a doctor can, using your tests and history. The NEPHLUX result only says whether a doctor should look at your kidneys, and a urine albumin test ordered by a doctor is what shows kidney damage.\n\nPlease bring your question to a YAKAP clinic (free at public clinics).",
  },
  refuse_values: {
    scope: 'medical',
    links: [CLINICS],
    text: "I can't read or judge your own numbers or results. A doctor reads them together with your history and other tests, so please show them to your YAKAP doctor.\n\nIf you feel very unwell, go to an emergency room.",
  },
  refuse_medicine: {
    scope: 'medical',
    links: [CLINICS],
    text: "I can't give advice about medicines, doses or remedies. Please ask your YAKAP doctor or a pharmacist, and don't start, stop or change a medicine on your own.",
  },
  refuse_symptom: {
    scope: 'medical',
    links: [CLINICS],
    text: "I can't say what a symptom means for you. Please see a YAKAP doctor, who can check you properly.\n\nIf it is sudden or severe, go to an emergency room now.",
  },
  refuse_off: {
    scope: 'off',
    links: [],
    text: 'Sorry, I can only help with questions about NEPHLUX, YAKAP clinics and kidney health. Try one of the questions below.',
  },
  fallback_domain: {
    scope: 'off',
    links: [{ label: 'FAQ', go: 'faq' }],
    text: "I don't have an approved answer for that yet. Try one of the questions below, or ask at your YAKAP clinic.",
  },
  did_you_mean: {
    scope: 'off',
    links: [],
    text: "I'm not sure I understood. Did you mean one of these?",
  },
  empty: {
    scope: 'off',
    links: [],
    text: 'Type a question, or tap one below.',
  },
};

// Nephra never calculates. Each role is sent to the screen that does the math.
const CALC: Record<NephraRole, FixedAnswer> = {
  guest: {
    scope: 'off',
    links: [{ label: 'Start the resident check', go: 'check' }],
    text: "I can't calculate scores, eGFR, costs or anything else. The resident check works out your result from your answers, and a YAKAP doctor uses the clinic screens for lab-based scores.",
  },
  resident: {
    scope: 'off',
    links: [{ label: 'Start the resident check', go: 'check' }],
    text: "I can't calculate scores, eGFR, costs or anything else. The resident check works out your result from your answers, and a YAKAP doctor uses the clinic screens for lab-based scores.",
  },
  doctor: {
    scope: 'off',
    links: [{ label: 'New assessment', go: 'assess' }],
    text: "I can't calculate risk scores, eGFR or anything else. Enter the labs on the New assessment screen; NEPHLUX computes the risk there and shows the reasons behind it.",
  },
  cho: {
    scope: 'off',
    links: [{ label: 'City overview', go: 'overview' }],
    text: "I can't calculate budgets, test counts or case numbers. Use the budget panel on the City overview screen; it shows how many cases each number of tests finds.",
  },
  bhw: {
    scope: 'off',
    links: [],
    text: "I can't calculate scores or numbers. Please use the app's screens or ask the YAKAP doctor.",
  },
};

// ------------------------------------------------------------ text normalisation
function lite(s: unknown): string {
  let t = String(s ?? '')
    .slice(0, 500)
    .toLowerCase();
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return t
    .replace(/[\u2018\u2019'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// phrases first (English, Filipino, Bisaya), then single words
const PHRASES: [RegExp, string][] = [
  [
    /\b(chronic kidney disease|kidney disease|sakit sa (bato|kidney|amimislon)|sakit sa mga (bato|kidney)|kidney failure)\b/g,
    ' ckd ',
  ],
  [
    /\b(urine albumin creatinine ratio|albumin creatinine ratio|urine albumin|albumin test)\b/g,
    ' uacr ',
  ],
  [/\b(blood pressure|alta presyon|high blood)\b/g, ' bp '],
  [
    /\b(check ?ups?|pa ?check|magpa ?check|consultations?|konsulta)\b/g,
    ' checkup ',
  ],
  [/\b(sign ?up|mag ?register|magparehistro)\b/g, ' register '],
  [/\b(opening hours|office hours)\b/g, ' hours '],
  [/\b(sign ?in|log ?in|log on)\b/g, ' login '],
  [
    /\b(covered|cover|covers|included|include|includes|part of|sakop|kasama|apil sa)\b/g,
    ' cover ',
  ],
  [/\b(cagayan de oro|cagayan|cdo)\b/g, ' cdo '],
  [/\b(health workers?|bhws?|barangay health workers?)\b/g, ' bhw '],
  [/\b(city health office|cho)\b/g, ' cho '],
  [/\b(yaman ng kalusugan)\b/g, ' yakap '],
  [
    /\b(this app|this website|this site|this tool|ni nga app|kini nga app|itong app|ang app na ito|app na ito)\b/g,
    ' nephlux ',
  ],
  [
    /\b(ibig sabihin|buot ipasabot|pasabot|kahulugan|ibig sabihin ng|means?|meaning)\b/g,
    ' meaning ',
  ],
  [
    /\b(what is (this|it) for|para saan|para asa|unsay gamit|unsa ang gamit|purpose)\b/g,
    ' purpose ',
  ],
  [/\b(how much|pila ang bayad|tagpila)\b/g, ' cost '],
];

const SYN: Record<string, string> = {
  bato: 'kidney',
  amimislon: 'kidney',
  kidneys: 'kidney',
  kidni: 'kidney',
  ihi: 'urine',
  wiwi: 'urine',
  pee: 'urine',
  urinate: 'urine',
  urinalysis: 'urinalysis',
  libre: 'free',
  bayad: 'cost',
  magkano: 'cost',
  mahal: 'cost',
  expensive: 'cost',
  afford: 'cost',
  presyo: 'cost',
  price: 'cost',
  costs: 'cost',
  pay: 'cost',
  charge: 'cost',
  charged: 'cost',
  gipabayad: 'cost',
  sinisingil: 'cost',
  doktor: 'doctor',
  doc: 'doctor',
  klinika: 'clinic',
  clinics: 'clinic',
  klinik: 'clinic',
  gamot: 'medicine',
  tambal: 'medicine',
  medicines: 'medicine',
  medication: 'medicine',
  meds: 'medicine',
  pill: 'medicine',
  pills: 'medicine',
  tablet: 'medicine',
  tableta: 'medicine',
  pinakamalapit: 'near',
  pinakaduol: 'near',
  malapit: 'near',
  duol: 'near',
  nearest: 'near',
  nearby: 'near',
  closest: 'near',
  close: 'near',
  saan: 'where',
  asa: 'where',
  nasaan: 'where',
  hain: 'where',
  nganong: 'why',
  bakit: 'why',
  ngano: 'why',
  presyon: 'bp',
  hypertension: 'bp',
  bp: 'bp',
  asukal: 'diabetes',
  diabetic: 'diabetes',
  sugar: 'diabetes',
  timbang: 'weight',
  edad: 'age',
  taon: 'age',
  old: 'age',
  sagot: 'answer',
  tubag: 'answer',
  answers: 'answer',
  mga: '',
  save: 'save',
  saved: 'save',
  gisave: 'save',
  isave: 'save',
  store: 'save',
  stored: 'save',
  stores: 'save',
  naka: '',
  resulta: 'result',
  results: 'result',
  nawala: 'lost',
  nakalimtan: 'lost',
  nakalimutan: 'lost',
  forgot: 'lost',
  forget: 'lost',
  lose: 'lost',
  mapa: 'map',
  oras: 'hours',
  abri: 'open',
  bukas: 'open',
  dadalhin: 'bring',
  dadon: 'bring',
  dala: 'bring',
  sintomas: 'symptom',
  symptoms: 'symptom',
  signs: 'symptom',
  sign: 'symptom',
  sanhi: 'cause',
  hinungdan: 'cause',
  causes: 'cause',
  caused: 'cause',
  alagaan: 'protect',
  atiman: 'protect',
  pagatiman: 'protect',
  maiwasan: 'protect',
  makaiwas: 'protect',
  avoid: 'protect',
  prevent: 'protect',
  healthy: 'protect',
  protection: 'protect',
  stop: 'protect',
  tagalog: 'language',
  bisaya: 'language',
  binisaya: 'language',
  cebuano: 'language',
  english: 'language',
  magbinisaya: 'language',
  salamat: 'thanks',
  thank: 'thanks',
  ty: 'thanks',
  hi: 'hello',
  hey: 'hello',
  kumusta: 'hello',
  musta: 'hello',
  maayong: 'hello',
  magandang: 'hello',
  buntag: 'morning',
  umaga: 'morning',
  konsulta: 'yakap',
  acr: 'uacr',
  avail: 'register',
  pasyente: 'patient',
  patients: 'patient',
  brgy: 'barangay',
  barangays: 'barangay',
  pin: 'login',
  password: 'login',
  cholesterol: 'lipid',
  lipids: 'lipid',
  signin: 'login',
  log: 'login',
  sumali: 'register',
  apil: 'register',
  enroll: 'register',
  join: 'register',
  magpalista: 'register',
  government: 'official',
  gobyerno: 'official',
  govt: 'official',
  behind: 'made',
  run: 'made',
  owns: 'made',
  website: 'app',
  site: 'app',
  webapp: 'app',
  application: 'app',
  gumawa: 'made',
  naghimo: 'made',
  make: 'made',
  built: 'made',
  philippine: 'filipino',
  pilipino: 'filipino',
  pinoy: 'filipino',
  filipinos: 'filipino',
  hemodialysis: 'dialysis',
  haemodialysis: 'dialysis',
  usbon: 'repeat',
  uulitin: 'repeat',
  again: 'repeat',
  buhaton: 'next',
  gagawin: 'next',
  gawin: 'next',
  buhat: 'next',
  next: 'next',
  now: 'next',
  nurse: 'person',
  tawo: 'person',
  human: 'person',
  someone: 'person',
  teenager: 'young',
  bata: 'young',
  child: 'young',
  children: 'young',
  minor: 'young',
  pregnant: 'pregnant',
  buntis: 'pregnant',
  mabdos: 'pregnant',
};

const STOPSET = new Set(
  (
    'a an the is are am was were be been being do does did doing i me my mine myself you your yours we our it its this that these those to of in on at for with and or but if so can could would should will shall may might must ' +
    "what which who whom whose how about from by as up out not no yes ok okay please there here then than too very just also any some all each more most much many really get got go going there's " +
    'po ba na ng sa ang si ni kay ko ako akin ka mo ikaw kayo kami tayo sila siya ito iyan yan yun nito niya nila ano anong paano gaano ilan para ay din rin lang naman pa nga ' +
    'wat whats wats isnt dont doesnt arent wasnt didnt cant wont actually exactly really itong ito iyong kini ani kana mao so okay unsa unsaon unsay man ra lang ug og nga ni kini kana sila siya ako nako akong ko imo imong ikaw mo kamo kita ta diay ba pod sad bitaw kay ang sa unta palihug pls plz'
  ).split(' '),
);

function stem(w: string): string {
  if (w.length > 4 && !/ss$/.test(w)) w = w.replace(/(ing|ed|es|ly|s|e)$/, '');
  return w.length > 6 ? w.slice(0, 6) : w;
}

function tokens(s: string): string[] {
  let t = lite(s);
  for (const [rx, rep] of PHRASES) t = t.replace(rx, rep);
  const out: string[] = [];
  for (let w of t.replace(/[^a-z0-9]+/g, ' ').split(' ')) {
    if (!w || STOPSET.has(w)) continue;
    if (Object.prototype.hasOwnProperty.call(SYN, w)) w = SYN[w];
    if (!w) continue;
    out.push(stem(w));
  }
  return out;
}

// ------------------------------------------------------------ hard filters (run before matching)
const MED =
  '(losartan|metformin|enalapril|amlodipine|gliclazide|metoprolol|simvastatin|insulin|medicines?|medications?|meds|gamot|tambal|pills?|tablets?|tableta|vitamins?|supplements?|ibuprofen|paracetamol|mefenamic|painkillers?|pain relievers?|aspirin|antibiotics?|maintenance)';

const RX = {
  selfharm:
    /\b(kill myself|suicid\w*|end my life|want to die|gusto ko na(ng)? mamatay|magpakamatay|patyon (nako )?(akong )?kaugalingon|maghikog|hurt myself|self ?harm)\b/,
  danger: [
    /\b(chest pain|pain in (my|the|his|her) chest|sakit (sa|ng) (dibdib|dughan)|(dughan|dibdib)\w* (\w+ )?(sakit|masakit)|(sakit|masakit|sumasakit)\w* (\w+ ){0,2}(dughan|dibdib))\b/,
    /\b((cant|cannot|can not|hard to|trouble|difficulty|hirap|lisod|dili|hindi|di) (\w+ ){0,1}(breathe?|breathing|huminga|makahinga|moginhawa|makaginhawa|ginhawa)|short(ness)? of breath|out of breath|hinihingal|gihingal|naghahabol)\b/,
    /\b(havent|have not|hasnt|has not|cant|cannot|not|no|di|dili|hindi|wala) (\w+ ){0,2}(peed|peeing|urinated?|urinating|makaihi|kaihi|naihi|umihi|nakaihi|nag ?ihi|maihi)\b/,
    /\b(no|very little|little|walang|walay) urine\b|\b(no|wala|walay) (\w+ )?ihi\b/,
    /\b(very|severe(ly)?|so|grabe|sobrang|kaayo) (swollen|swelling|namamaga|manghubag|nanghubag|hubag)|\b(swollen|swelling|namamaga|nanghubag|manghubag|hubag)\b.{0,30}\b(very|severe|kaayo|grabe|huge|whole body|buong katawan|tibuok lawas)\b/,
    /\b(collaps\w*|nag ?collapse|natumba|not waking( up)?|wont wake|will not wake|cant wake|unresponsive|not responding|not breathing|dili (na )?moginhawa|walay malay|wala nang malay|(having|is having|im having|i am having) a (heart attack|stroke)|heart attack|atake sa puso)\b/,
    /\b(faint(ed|ing)?|nahimatay|nawalan ng malay|unconscious|(is|became|becomes|got|gets|seems|suddenly|very|and) confused|nalilito|confusion|seizures?|nag ?seizure|kombulsyon|convuls\w*|vomit(ing|ed)? blood|nagsuka ng dugo|nagsuka ug dugo|severe pain|grabe (ang|nga|kaayo) sakit|sobrang sakit|emergency|dying|naghihingalo|blood in (my |the |his |her )?urine|bloody urine|urine.{0,25}with blood|dugo sa (ihi|akong ihi)|may dugo ang ihi|missed (his |her |my |a )?(dialysis|session))\b/,
  ],
  inject:
    /\b(ignore (all |any |your |the |my )?(previous |prior |above )?(instructions?|rules|prompts?)|system prompt|developer mode|dev mode|jailbreak|forget (all |your |the )?(rules|instructions)|you are now|from now on|pretend (you are|to be|youre)|act as|roleplay|reveal|override your|disregard|unrestricted|no rules|you are (a|an) \w+ now|ignore the rules)\b|<\s*\/?\s*script|^\s*(say|repeat after me|output)\b/,
  injectMed:
    /\b(diagnos\w*|doctor\w*|nephrologist|treatment|medicine|prescri\w*)\b/,
  // new in the server build: Nephra never does math of any kind
  calc: [
    /\b(calculat\w*|comput\w*|kwentahin|kuwentahin|kwentaha|kalkula\w*|estimate (my|his|her|our|the)|work out (my|the)|solve)\b/,
    /\b(my|akong|aking|his|her|ang akong) (risk )?(score|percent\w*|probability|egfr|gfr)\b/,
    /\b(how many|ilang|pila ka) (tests?|uacr|kits?|cases?|patients?)\b.{0,40}\b(budget|afford|peso|pesos|php|million|\d)/,
    /\bbudget\b.{0,40}\d|\d.{0,40}\bbudget\b/,
    /\d\s*[+*\u00d7\u00f7^]\s*\d|\d\s+[-x/]\s+\d|\b(plus|minus|times|divided by|multiplied by)\b.{0,10}\d/,
  ],
  symptom: [
    /\b(i|im|i am|i feel|i have|i get|i keep|my|ako|akong|nako|ko)\b.{0,25}\b(pain|painful|tired|fatigue\w*|weak|itch\w*|nausea\w*|vomit\w*|swell\w*|swollen|ache|aching|dizzy|headache|fever|lagnat|kapoy|pagod|hilo|nahihilo|urinate a lot|pee a lot|foamy|bubbly|dark urine)\b/,
    /\bsakit (ang |akong |ang akong |ng )?(likod|tiyan|ulo|hawak|balakang|tagiliran)\b/,
  ],
  diagnosis: [
    /\b(do i have(?! to)|have i got|am i (sick|ok|okay|fine|healthy|normal|going to|at risk|safe|dying)|im (fine|ok|okay|healthy|safe)|i am (fine|ok|okay|healthy|safe)|i dont need (a |the )?(checkup|check ?up|test|doctor)|may sakit (ba )?(ako|ko)|naa ba ko(y)?|naa (ba )?koy (sakit|ckd)|what stage|which stage|my stage|anong stage|unsa nga stage|will i (need|get|die|have|be)|am i going|how long (will|do|can) i|how long to live|diagnose me|can you diagnose|diagnose my|my diagnosis|diagnosis ko|tell me my|(do|are|is) my kidneys?|(okay|ok|normal|maayo|healthy) ba (ang )?(akong |aking )?(kidney|bato)|is (that|this|it) (because of |from |due to )?(my )?kidneys?|is my (kidney|result|lab|urine|creatinine|egfr|uacr|acr|hba1c|bp|blood|sugar)|does (that|this|it) mean i|means? i have|delikado (ba|na)|okay ra ba|normal (ba|lang ba)|is that bad|is it bad|foamy)\b/,
    /\b(read|check|interpret|explain|look at) (my|these|our) (labs?|results?|tests?|urine|numbers)\b/,
    /\b(my|akong|ang akong|ko|nako|ng|sa) (labs?|creatinine|egfr|uacr|acr|hba1c|a1c|bp|blood pressure|urinalysis|sugar|fbs|cholesterol)\b.{0,15}\b(is|are|says|shows|showed|was|came back|ko|nako|ay)\b/,
  ],
  values: [
    /\b(creatinine|egfr|gfr|uacr|acr|hba1c|a1c|bp|blood pressure|sugar|fbs|cholesterol|protein|urinalysis|result|resulta|presyon)\b\D{0,14}\d/,
    /\d[\d.,]*\s*(mg\/?g|mg\/?dl|mg\/?mmol|umol|mmol|ml\/min)\b|\d[\d.,]*\s*(creatinine|egfr|uacr|hba1c|a1c)\b|\b\d{2,3}\s*\/\s*\d{2,3}\b/,
  ],
  medAdvice: new RegExp(
    '\\b(herbal|treatment plan|dose|dosage|dosis)\\b|(\\b(take|takes|taking|uminom|inumin|inom|imnon|moinom|mo inom|stop|stopping|double|skip|quit|change|switch|how much|how many|pila|ilang|should i|safe|okay ba|ok ba|good for|para sa|for my)\\b.{0,40}\\b' +
      MED +
      '\\b)|(\\b' +
      MED +
      '\\b.{0,40}\\b(take|uminom|inumin|imnon|stop|double|skip|should i|can i|safe|okay ba|ok ba|dose|daily|araw ?araw|adlaw ?adlaw|for my kidney|para sa (akong |aking )?(bato|kidney))\\b)',
  ),
};

const OFFWORDS =
  /\b(homework|assignment|essay|python|javascript|election|president|senator|joke|weather|forecast|restaurant|beach|resort|movie|song|lyrics|poem|story|translate|loan|passport|iphone|taxi|bet|betting|crypto|bitcoin|stocks?|capital of|recipe|dengue|covid|game|games|basketball|boyfriend|girlfriend|math|equation|solve)\b/;
const STRONG =
  /\b(nephlux|nephra|kidney|kidneys|bato|amimislon|ckd|yakap|konsulta|philhealth|uacr|albumin\w*|dialysis|urine|ihi|creatinine|egfr|clinic\w*|referral)\b/;
const DOMAIN =
  /\b(nephlux|nephra|kidney|kidneys|bato|amimislon|ckd|yakap|konsulta|philhealth|uacr|albumin\w*|dialysis|urine|ihi|creatinine|egfr|clinic\w*|referral|barangay|bhw|cho|result|check|app|code|screen|map|test|lab|labs|doctor|bp|diabetes|ogtt|hba1c|fbs|cbc|lipids?|internet|offline|chance|model)\b/;

const anyRx = (list: RegExp[], s: string) => list.some((rx) => rx.test(s));

// Order matters: emergencies first, then injection, medicine, own values, math,
// diagnosis, symptoms, and finally clearly off-topic questions.
export function filter(question: string): FixedId | null {
  const q = lite(question);
  if (RX.selfharm.test(q)) return 'safety_selfharm';
  if (anyRx(RX.danger, q)) return 'safety_danger';
  if (RX.inject.test(q))
    return RX.injectMed.test(q) ? 'refuse_diagnosis' : 'refuse_off';
  if (RX.medAdvice.test(q)) return 'refuse_medicine';
  if (anyRx(RX.values, q)) return 'refuse_values';
  if (anyRx(RX.calc, q)) return 'refuse_calc';
  if (anyRx(RX.diagnosis, q)) return 'refuse_diagnosis';
  if (anyRx(RX.symptom, q)) return 'refuse_symptom';
  if (OFFWORDS.test(q) && !STRONG.test(q)) return 'refuse_off';
  return null;
}

export function isInDomain(question: string): boolean {
  return DOMAIN.test(lite(question));
}

// ------------------------------------------------------------ BM25 over example phrasings
// words that set the scene but can't carry a match on their own ("who is the mayor of cdo")
const CONTEXT = new Set(
  'cdo barangay city people person philip filipi give time write tell fix phone meaning made use apply about good best help need want know see show say take list number open work thing way life love'
    .split(' ')
    .map(stem),
);
const K1 = 1.2;
const B = 0.75;
const MIN_SCORE = 1.6;
const MIN_COVER = 0.4;

interface Doc {
  id: string;
  tf: Record<string, number>;
  len: number;
}

const DOCS: Doc[] = [];
const DF: Record<string, number> = {};
const BYID: Record<string, NephraIntent> = {};
const EXACT: Record<string, string> = {};
let AVGDL = 0;
let N = 0;

function key(s: string): string {
  return lite(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

(function index() {
  let tot = 0;
  for (const it of NEPHRA_BANK.intents) {
    BYID[it.id] = it;
    for (const ex of it.ex.concat(it.chip ? [it.chip] : [])) {
      if (!EXACT[key(ex)]) EXACT[key(ex)] = it.id;
      const t = tokens(ex);
      if (!t.length) continue;
      const tf: Record<string, number> = {};
      for (const w of t) tf[w] = (tf[w] || 0) + 1;
      for (const w in tf) DF[w] = (DF[w] || 0) + 1;
      DOCS.push({ id: it.id, tf, len: t.length });
      tot += t.length;
    }
  }
  N = DOCS.length;
  AVGDL = tot / N;
})();

function lev1(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

// unknown word of 4+ letters -> closest known word with the same first letter (1 edit, 2 if long)
function fix(w: string): string {
  if (DF[w] || w.length < 4 || /^\d+$/.test(w)) return w;
  const max = w.length >= 7 ? 2 : 1;
  let bestW: string | null = null;
  let bestDf = 0;
  for (const v in DF)
    if (v[0] === w[0] && DF[v] > bestDf && lev1(w, v, max)) {
      bestW = v;
      bestDf = DF[v];
    }
  return bestW || w;
}

function idf(w: string): number {
  const df = DF[w] || 0;
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

// Approved answers ranked for a question, best first (one entry per answer).
export function rank(question: string, role?: NephraRole): Ranked[] {
  const uq = [...new Set(tokens(question).map(fix))];
  if (!uq.length) return [];
  let mass = 0;
  for (const w of uq)
    mass += (/^\d+$/.test(w) ? 0.3 : DF[w] ? 1 : 0.7) * idf(w);
  const best: Record<string, Ranked> = {};
  for (const doc of DOCS) {
    let s = 0;
    let cov = 0;
    let core = 0;
    for (const w of uq) {
      const f = doc.tf[w];
      if (!f) continue;
      if (!CONTEXT.has(w)) core++;
      const wi = idf(w);
      s += (wi * f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.len) / AVGDL));
      cov += wi;
    }
    if (!s || !core) continue;
    const it = BYID[doc.id];
    if (role && it.roles?.includes(role)) s *= 1.1;
    const c = cov / mass;
    if (!best[doc.id] || s > best[doc.id].score)
      best[doc.id] = { id: doc.id, score: s, cover: c };
  }
  return Object.values(best).sort((a, b) => b.score - a.score);
}

export function exactMatch(question: string): string | undefined {
  return EXACT[key(question)];
}

export function getIntent(id: string): NephraIntent | undefined {
  return BYID[id];
}

export function display(id: string): string {
  const it = BYID[id];
  let t = it.q || it.chip || it.ex[0];
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[?]$/.test(t) ? t : t + '?';
}

export function fixedAnswer(id: FixedId, role: NephraRole): EngineAnswer {
  const f = id === 'refuse_calc' ? CALC[role] : FIXED[id];
  return { id, text: f.text, scope: f.scope, links: f.links.slice() };
}

export function intentAnswer(id: string, score?: number): EngineAnswer {
  const it = BYID[id];
  return {
    id,
    text: it.a,
    scope: 'in',
    links: (it.links || []).slice(),
    score,
  };
}

// The full deterministic answer, exactly as in the prototype (plus the math rule).
export function answer(question: string, role: NephraRole): EngineAnswer {
  const q = lite(question);
  if (!q.replace(/[^a-z0-9]/g, '')) return fixedAnswer('empty', role);
  const f = filter(q);
  if (f) return fixedAnswer(f, role);
  const ex = exactMatch(q);
  if (ex) return intentAnswer(ex, 99);
  const list = rank(question, role);
  const b = list[0];
  if (b && b.score >= MIN_SCORE && b.cover >= MIN_COVER)
    return intentAnswer(b.id, Math.round(b.score * 100) / 100);
  // not sure: offer the closest approved questions instead of guessing (tap to ask)
  if (b && b.score >= 0.8 && b.cover >= 0.25) {
    const sug = list
      .filter((r) => r.score >= 0.5 * b.score)
      .slice(0, 3)
      .map((r) => display(r.id));
    const d = fixedAnswer('did_you_mean', role);
    return {
      ...d,
      suggest: sug,
      text: d.text + '\n\n' + sug.map((x) => '\u2022 ' + x).join('\n'),
    };
  }
  return fixedAnswer(DOMAIN.test(q) ? 'fallback_domain' : 'refuse_off', role);
}

const SUGGEST: Record<NephraRole, string[]> = {
  guest: [
    'what_is_nephlux',
    'how_to_use',
    'is_it_diagnosis',
    'yakap_cost',
    'accuracy_model',
    'sample_data',
  ],
  resident: [
    'how_resident_check',
    'result_higher',
    'next_steps',
    'find_clinic',
    'yakap_cost',
    'protect_kidneys',
  ],
  doctor: ['doctor_code', 'doctor_levels', 'accuracy_model', 'sample_data'],
  bhw: ['bhw_lists', 'sample_data', 'uacr_what', 'yakap_cost'],
  cho: ['cho_map', 'cho_budget', 'accuracy_model', 'cdo_burden', 'sample_data'],
};

export function suggestions(role: NephraRole): string[] {
  return SUGGEST[role].map((id) => BYID[id].chip || display(id));
}

export const BANK_VERSION = NEPHRA_BANK.version;
