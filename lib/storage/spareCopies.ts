import type { StoredState } from "./types";

/** Пересчитать spareCopies из всех карт в pulls (миграция / починка). */
export function rebuildSpareCopiesFromPulls(state: StoredState): void {
  const counts: Record<string, number> = {};
  for (const pull of state.pulls) {
    for (const c of pull.cards) {
      const k = String(c.appid);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  state.spareCopies = counts;
}

export function addCardsToSpareCopies(
  state: StoredState,
  cards: { appid: number }[],
): void {
  for (const c of cards) {
    const k = String(c.appid);
    state.spareCopies[k] = (state.spareCopies[k] ?? 0) + 1;
  }
}
