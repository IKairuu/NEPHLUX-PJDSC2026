// The ten resident-check questions, in English, Bisaya (ceb) and Tagalog (fil).
// Bisaya and Tagalog are draft translations for review by native speakers.

export type QuestionType = 'number' | 'choice' | 'weightHeight' | 'barangay';

export interface LocalizedText {
  en: string;
  ceb: string;
  fil: string;
}

export interface QuestionOption {
  value: boolean;
  label: LocalizedText;
}

export interface ResidentQuestion {
  key: string; // field name in the POST /resident-check body
  type: QuestionType;
  question: LocalizedText;
  options?: QuestionOption[];
  min?: number;
  max?: number;
}

const YES_NO_NOT_SURE: QuestionOption[] = [
  { value: true, label: { en: 'Yes', ceb: 'Oo', fil: 'Oo' } },
  {
    value: false,
    label: {
      en: 'No / not sure',
      ceb: 'Wala / dili sigurado',
      fil: 'Hindi / hindi sigurado',
    },
  },
];

const YES_NO: QuestionOption[] = [
  { value: true, label: { en: 'Yes', ceb: 'Oo', fil: 'Oo' } },
  { value: false, label: { en: 'No', ceb: 'Dili', fil: 'Hindi' } },
];

export const RESIDENT_QUESTIONS: ResidentQuestion[] = [
  {
    key: 'age',
    type: 'number',
    min: 20,
    max: 100,
    question: {
      en: 'How old are you?',
      ceb: 'Pila na ang imong edad?',
      fil: 'Ilang taon na kayo?',
    },
  },
  {
    key: 'female',
    type: 'choice',
    question: {
      en: 'Sex at birth',
      ceb: 'Sekso sa pagkatawo',
      fil: 'Kasarian sa kapanganakan',
    },
    options: [
      { value: true, label: { en: 'Female', ceb: 'Babaye', fil: 'Babae' } },
      { value: false, label: { en: 'Male', ceb: 'Lalaki', fil: 'Lalaki' } },
    ],
  },
  {
    key: 'dmHx',
    type: 'choice',
    question: {
      en: 'Has a doctor ever told you that you have diabetes?',
      ceb: 'Gisultihan na ba ka sa doktor nga naa kay diabetes?',
      fil: 'Sinabihan na ba kayo ng doktor na may diabetes kayo?',
    },
    options: YES_NO_NOT_SURE,
  },
  {
    key: 'htnHx',
    type: 'choice',
    question: {
      en: 'Has a doctor ever told you that you have high blood pressure?',
      ceb: 'Gisultihan na ba ka sa doktor nga taas ang imong presyon?',
      fil: 'Sinabihan na ba kayo ng doktor na mataas ang presyon ninyo?',
    },
    options: YES_NO_NOT_SURE,
  },
  {
    key: 'bpMed',
    type: 'choice',
    question: {
      en: 'Do you take medicine for blood pressure now?',
      ceb: 'Nag-inom ka ba karon og tambal sa presyon?',
      fil: 'Umiinom ba kayo ngayon ng gamot sa presyon?',
    },
    options: YES_NO,
  },
  {
    key: 'cvdHx',
    type: 'choice',
    question: {
      en: 'Have you ever had a heart attack, stroke or heart failure?',
      ceb: 'Na-heart attack, na-stroke o nag-heart failure na ba ka?',
      fil: 'Na-heart attack, na-stroke o nagka-heart failure na ba kayo?',
    },
    options: YES_NO,
  },
  {
    key: 'smoker',
    type: 'choice',
    question: {
      en: 'Do you smoke cigarettes now?',
      ceb: 'Nanigarilyo ka ba karon?',
      fil: 'Naninigarilyo ba kayo ngayon?',
    },
    options: YES_NO,
  },
  {
    key: 'famDm',
    type: 'choice',
    question: {
      en: 'Does a parent, brother or sister have diabetes?',
      ceb: 'Naa ba kay ginikanan o igsoon nga naay diabetes?',
      fil: 'May magulang o kapatid ba kayong may diabetes?',
    },
    options: YES_NO_NOT_SURE,
  },
  {
    key: 'weightHeight',
    type: 'weightHeight',
    question: {
      en: 'Your weight and height',
      ceb: 'Imong timbang ug gitas-on (puwede ang banabana)',
      fil: 'Timbang at taas (puwede ang tantiya)',
    },
  },
  {
    key: 'barangayId',
    type: 'barangay',
    question: {
      en: 'Your barangay in Cagayan de Oro',
      ceb: 'Imong barangay sa Cagayan de Oro',
      fil: 'Ang barangay ninyo sa Cagayan de Oro',
    },
  },
];
