export type NephraKind =
  | 'answer' // an approved answer (or the model's rewording of one)
  | 'emergency' // danger sign or self-harm: go to the ER now
  | 'see_doctor' // diagnosis, own results, medicine or symptom questions
  | 'no_calculation' // Nephra never calculates; points to the screen that does
  | 'did_you_mean' // unsure: offers the closest approved questions
  | 'no_answer' // in the app's topic, but no approved answer yet
  | 'off_topic';

export class NephraLinkDto {
  label: string;
  // the prototype's link key: check, clinics, how, evidence, portal, faq, assess, overview
  go: string;
  // a frontend route for that key
  path: string;
}

export class NephraChatResponseDto {
  reply: string;
  kind: NephraKind;
  // the approved answer or fixed safety answer used
  answerId: string;
  // "approved" = bank text as written; "model" = reworded by the language model
  source: 'approved' | 'model';
  // the AI model that wrote the reply, when source is "model"
  model?: string;
  links: NephraLinkDto[];
  suggestions: string[];
  disclaimer: string;
}

export class NephraInfoResponseDto {
  bankVersion: string;
  modelEnabled: boolean;
  suggestions: string[];
  disclaimer: string;
}
