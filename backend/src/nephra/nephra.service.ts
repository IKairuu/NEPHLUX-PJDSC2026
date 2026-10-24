import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { NephraIntent, NephraLink } from './nephra-bank';
import {
  answer,
  BANK_VERSION,
  EngineAnswer,
  NephraRole,
  suggestions,
} from './nephra-engine';
import { NephraAgent } from './nephra.agent';
import { NephraRateLimiter } from './nephra-rate-limiter';
import { NephraRepository } from './nephra.repository';
import { CreateNephraChatDto } from './dto/create-nephra-chat.dto';
import {
  NephraChatResponseDto,
  NephraInfoResponseDto,
  NephraKind,
  NephraLinkDto,
} from './dto/nephra-response.dto';

const KIND: Record<string, NephraKind> = {
  safety_danger: 'emergency',
  safety_selfharm: 'emergency',
  refuse_diagnosis: 'see_doctor',
  refuse_values: 'see_doctor',
  refuse_medicine: 'see_doctor',
  refuse_symptom: 'see_doctor',
  refuse_calc: 'no_calculation',
  did_you_mean: 'did_you_mean',
  fallback_domain: 'no_answer',
  refuse_off: 'off_topic',
  empty: 'off_topic',
};

// Answers the model may reword. Everything else (emergencies, doctor-only
// questions, math, off-topic) is answered by the fixed text, never the model.
const MODEL_KINDS: NephraKind[] = ['answer', 'did_you_mean', 'no_answer'];

const MAX_REPLY_CHARS = 1200;

@Injectable()
export class NephraService {
  constructor(
    private readonly nephraRepository: NephraRepository,
    private readonly nephraAgent: NephraAgent,
    private readonly rateLimiter: NephraRateLimiter,
  ) {}

  info(role: NephraRole = 'guest'): NephraInfoResponseDto {
    return {
      bankVersion: BANK_VERSION,
      modelEnabled: this.nephraAgent.enabled,
      suggestions: suggestions(role),
      disclaimer: this.disclaimer(),
    };
  }

  // userKey identifies the sender for the rate limit (the client IP address)
  async chat(
    dto: CreateNephraChatDto,
    userKey: string,
  ): Promise<NephraChatResponseDto> {
    const role = dto.role ?? 'guest';
    // 1. deterministic rules first: danger signs, diagnosis, medicine, math
    const rules = answer(dto.message, role);
    const kind = KIND[rules.id] ?? 'answer';
    // an emergency answer is never rate limited
    if (kind === 'emergency') return this.fromRules(rules, kind, role);

    const limit = this.rateLimiter.hit(userKey);
    if (!limit.allowed)
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            "You've sent a lot of questions. Please wait a moment and try again. If you feel very unwell, go to the nearest emergency room or call 911.",
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

    if (!MODEL_KINDS.includes(kind) || !this.nephraAgent.enabled)
      return this.fromRules(rules, kind, role);

    // 2. the approved answers the model may use
    // the previous real question ("speak in Bisaya" only sets the language)
    const previous = [...(dto.history ?? [])]
      .reverse()
      .find((t) => t.who === 'user' && !isLanguageOnly(t.text))?.text;
    const candidates = this.nephraRepository
      .findCandidates(dto.message, role, previous)
      .map(forModel);

    // past the server's daily AI budget, answer from the bank only
    if (!candidates.length || !this.rateLimiter.takeModelCall())
      return this.fromRules(rules, kind, role);

    // 3. the model rewords one of them; anything off-script falls back
    const res = await this.nephraAgent.reply(
      buildPrompt(
        dto.message,
        role,
        dto.screen,
        previous,
        replyLanguage(dto),
        candidates,
      ),
    );
    const checked = res && checkReply(res.text, candidates);
    if (!checked) return this.fromRules(rules, kind, role);

    return {
      reply: checked.text,
      kind: 'answer',
      answerId: checked.intent.id,
      source: 'model',
      model: res.model,
      links: this.links(checked.intent.links ?? [], role),
      suggestions: suggestions(role),
      disclaimer: this.disclaimer(),
    };
  }

  private fromRules(
    rules: EngineAnswer,
    kind: NephraKind,
    role: NephraRole,
  ): NephraChatResponseDto {
    return {
      reply: rules.text,
      kind,
      answerId: rules.id,
      source: 'approved',
      links: this.links(rules.links, role),
      suggestions: rules.suggest ?? suggestions(role),
      disclaimer: this.disclaimer(),
    };
  }

  private links(links: NephraLink[], role: NephraRole): NephraLinkDto[] {
    return links.map((l) => ({ ...l, path: pathFor(l.go, role) }));
  }

  private disclaimer(): string {
    return this.nephraAgent.enabled
      ? 'Checked answers about NEPHLUX, YAKAP and kidney health, worded by an AI model. Not a doctor and not a diagnosis. Nephra saves nothing, but your question is sent to the AI service, so do not type names or personal details.'
      : 'Checked answers about NEPHLUX, YAKAP and kidney health. Not a doctor and not a diagnosis. Nephra saves nothing you type.';
  }
}

function buildPrompt(
  question: string,
  role: NephraRole,
  screen: string | undefined,
  previous: string | undefined,
  language: string | undefined,
  candidates: NephraIntent[],
): string {
  const bank = candidates
    .map((it) => `[${it.id}]\nQ: ${it.q ?? it.chip ?? it.ex[0]}\nA: ${it.a}`)
    .join('\n\n');
  return [
    `USER ROLE: ${role}${screen ? `, on screen "${screen}"` : ''}`,
    previous ? `EARLIER QUESTION: """${previous}"""` : '',
    language ? `REPLY LANGUAGE: ${language}` : '',
    `QUESTION: """${question}"""`,
    `APPROVED ANSWERS:\n${bank}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// With a model the bank's "English only" line is no longer true.
const MODEL_TEXT: Record<string, string> = {
  language:
    'Yes. You can ask in English, Tagalog or Bisaya, and I will answer in the same language. Just tell me which one you prefer.',
};

function forModel(it: NephraIntent): NephraIntent {
  return MODEL_TEXT[it.id] ? { ...it, a: MODEL_TEXT[it.id] } : it;
}

// The language the user last asked for, in this message or an earlier one.
const LANGUAGES: [RegExp, string][] = [
  [/\b(bisaya|binisaya|cebuano|sinugbuanon)\b/i, 'Bisaya (Cebuano)'],
  [/\b(tagalog|in filipino|filipino please)\b/i, 'Filipino (Tagalog)'],
  [/\b(in english|english please|speak english)\b/i, 'English'],
];

function isLanguageOnly(text: string): boolean {
  return (
    LANGUAGES.some(([rx]) => rx.test(text)) &&
    text.trim().split(/\s+/).length <= 6
  );
}

function replyLanguage(dto: CreateNephraChatDto): string | undefined {
  const turns = [
    dto.message,
    ...[...(dto.history ?? [])]
      .reverse()
      .filter((t) => t.who === 'user')
      .map((t) => t.text),
  ];
  for (const t of turns)
    for (const [rx, lang] of LANGUAGES) if (rx.test(t)) return lang;
  return undefined;
}

// Accepts the model's reply only if it names one of the given answers and
// adds no number that is not already in them (so it cannot slip in math).
function checkReply(
  raw: string,
  candidates: NephraIntent[],
): { intent: NephraIntent; text: string } | null {
  const m = /^\s*\**USE:\**\s*([A-Za-z0-9_]+)\s*/.exec(raw);
  if (!m || m[1].toUpperCase() === 'NONE') return null;
  const intent = candidates.find((c) => c.id === m[1]);
  if (!intent) return null;
  const text = raw.slice(m[0].length).trim();
  if (!text || text.length > MAX_REPLY_CHARS) return null;

  const source = candidates.map((c) => c.a).join(' ');
  const allowed = new Set(numbersIn(source));
  if (numbersIn(text).some((n) => !allowed.has(n))) return null;
  if (/https?:\/\/|www\./i.test(text) && !/https?:\/\/|www\./i.test(source))
    return null;
  return { intent, text };
}

function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

// Frontend routes for the prototype's link keys.
function pathFor(go: string, role: NephraRole): string {
  switch (go) {
    case 'check':
    case 'clinics':
      return '/resident/check';
    case 'evidence':
      return role === 'doctor' || role === 'cho'
        ? `/${role}/evidence`
        : '/#evidence';
    case 'portal':
      return '/login/doctor';
    case 'assess':
      return '/doctor/assess';
    case 'overview':
      return '/cho/overview';
    default:
      return `/#${go}`;
  }
}
