// Small-cell suppression for counts that leave the clinic (CHO dashboard).
// A count of 1 to min-1 is shown as "<min"; 0 and counts >= min are shown as-is.
export type SuppressedCount = number | string;

export function suppress(n: number, min: number): SuppressedCount {
  return n > 0 && n < min ? `<${min}` : n;
}

// A rate built on a suppressed count would reveal it, so it is withheld too
export function suppressRate(
  numerator: number,
  denominatorCount: number,
  rate: number,
  min: number,
): number | null {
  if (numerator > 0 && numerator < min) return null;
  if (denominatorCount > 0 && denominatorCount < min) return null;
  return rate;
}
