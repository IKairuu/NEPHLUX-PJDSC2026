import { Injectable } from '@nestjs/common';

// In-memory limits for Nephra, so one user cannot use up the free AI quota.
//   NEPHRA_RATE_PER_MINUTE  messages per user (IP address) per minute, default 10
//   NEPHRA_RATE_PER_DAY     messages per user per day, default 100
//   NEPHRA_MODEL_DAILY_CAP  AI calls for the whole server per day, default 900;
//                           past it Nephra answers from the approved bank only
// Counts live in memory only (no IP is stored) and reset when the server restarts.

interface Bucket {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MAX_TRACKED = 10_000;

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

@Injectable()
export class NephraRateLimiter {
  private readonly perMinute = envInt('NEPHRA_RATE_PER_MINUTE', 10);
  private readonly perDay = envInt('NEPHRA_RATE_PER_DAY', 100);
  private readonly modelCap = envInt('NEPHRA_MODEL_DAILY_CAP', 900);
  private readonly buckets = new Map<string, Bucket>();
  private modelDayStart = Date.now();
  private modelCount = 0;

  // Counts one message from this user and says whether it may go through.
  hit(key: string, now = Date.now()): RateDecision {
    if (this.buckets.size > MAX_TRACKED) this.prune(now);
    let b = this.buckets.get(key);
    if (!b) {
      b = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
      this.buckets.set(key, b);
    }
    if (now - b.minuteStart >= MINUTE) {
      b.minuteStart = now;
      b.minuteCount = 0;
    }
    if (now - b.dayStart >= DAY) {
      b.dayStart = now;
      b.dayCount = 0;
    }
    if (b.dayCount >= this.perDay)
      return {
        allowed: false,
        retryAfterSeconds: secs(b.dayStart + DAY - now),
      };
    if (b.minuteCount >= this.perMinute)
      return {
        allowed: false,
        retryAfterSeconds: secs(b.minuteStart + MINUTE - now),
      };
    b.minuteCount++;
    b.dayCount++;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Reserves one AI call from the server-wide daily budget.
  takeModelCall(now = Date.now()): boolean {
    if (now - this.modelDayStart >= DAY) {
      this.modelDayStart = now;
      this.modelCount = 0;
    }
    if (this.modelCount >= this.modelCap) return false;
    this.modelCount++;
    return true;
  }

  private prune(now: number) {
    for (const [key, b] of this.buckets)
      if (now - b.dayStart >= DAY) this.buckets.delete(key);
  }
}

function secs(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}
