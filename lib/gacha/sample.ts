/** Fisher–Yates shuffle copy; returns first `k` elements (without replacement). */
export function sampleWithoutReplacement<T>(items: T[], k: number, rng: () => number): T[] {
  const copy = [...items];
  const n = copy.length;
  const take = Math.min(k, n);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, take);
}
