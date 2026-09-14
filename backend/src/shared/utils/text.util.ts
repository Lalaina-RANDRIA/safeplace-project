export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function containsAny(value: string, terms: readonly string[]): boolean {
  const normalized = value.toLocaleLowerCase();
  return terms.some((term) => normalized.includes(term.toLocaleLowerCase()));
}
