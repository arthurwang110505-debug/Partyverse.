/**
 * Shared validators for content decks. Engines keep their banks local;
 * tests import this so every prompt has required fields and unique ids.
 */

export function assertUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of ids) {
    if (!id || typeof id !== "string") throw new Error(`${label}: empty id`);
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  if (dupes.length) throw new Error(`${label}: duplicate ids ${dupes.join(", ")}`);
}

export function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}: expected non-empty string`);
  }
}

/** 4-digit numeric passcodes used by Mystery Room. */
export function isFourDigitCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/**
 * Brute-force check: among 0000–9999, only `correct` should satisfy the
 * predicate derived from the case. Callers supply the predicate so each
 * mystery stays self-describing without a shared solver DSL.
 */
export function countCodeSolutions(isValid: (code: string) => boolean, limit = 10000): number {
  let n = 0;
  for (let i = 0; i < limit; i++) {
    const code = String(i).padStart(4, "0");
    if (isValid(code)) n += 1;
  }
  return n;
}
