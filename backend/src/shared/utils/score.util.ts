export function clampScore(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function roundScore(value: number): number {
  return Math.round(clampScore(value) * 100) / 100;
}
