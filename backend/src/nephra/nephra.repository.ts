import { Injectable } from '@nestjs/common';
import { NephraIntent } from './nephra-bank';
import { exactMatch, getIntent, NephraRole, rank } from './nephra-engine';

const MAX_CANDIDATES = 5;
const MIN_CANDIDATE_SCORE = 0.5;
const STRONG_SCORE = 1.6;
const SHORT_WORDS = 5;

// Nephra stores nothing and has no database tables. This layer only reads the
// approved answer bank (78 answers from prototype v7) that ships with the code.
@Injectable()
export class NephraRepository {
  findIntentById(id: string): NephraIntent | undefined {
    return getIntent(id);
  }

  // The approved answers the language model may choose from, best first.
  // Follow-ups such as 'how much is it?' also use the previous question.
  findCandidates(
    question: string,
    role: NephraRole,
    previousQuestion?: string,
  ): NephraIntent[] {
    const ids: string[] = [];
    const add = (id: string) => {
      if (!ids.includes(id)) ids.push(id);
    };
    const ex = exactMatch(question);
    if (ex) add(ex);
    const ranked = rank(question, role);
    // a short or weak question is read together with the previous one first
    const short = question.trim().split(/\s+/).length <= SHORT_WORDS;
    if (previousQuestion && (short || (ranked[0]?.score ?? 0) < STRONG_SCORE)) {
      rank(previousQuestion + ' ' + question, role)
        .filter((r) => r.score >= MIN_CANDIDATE_SCORE)
        .slice(0, 3)
        .forEach((r) => add(r.id));
    }
    ranked
      .filter((r) => r.score >= MIN_CANDIDATE_SCORE)
      .forEach((r) => add(r.id));
    return ids
      .slice(0, MAX_CANDIDATES)
      .map((id) => getIntent(id))
      .filter((it): it is NephraIntent => !!it);
  }
}
