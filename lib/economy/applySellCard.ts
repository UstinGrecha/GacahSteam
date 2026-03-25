import { cardSellCoins } from "@/lib/economy/cardSellPrice";
import { rebuildSpareCopiesFromPulls } from "@/lib/storage/spareCopies";
import type { StoredState } from "@/lib/storage/types";

export type SellCardResult =
  | { ok: true; coinsGained: number }
  | { ok: false; code: "pull_not_found" | "invalid_slot" };

/**
 * Удаляет одну карту из указанного слота пака, начисляет монеты, пересчитывает spareCopies.
 */
export function applySellCardAtSlot(
  state: StoredState,
  pullId: string,
  slotIndex: number,
): SellCardResult {
  const pi = state.pulls.findIndex((p) => p.id === pullId);
  if (pi === -1) return { ok: false, code: "pull_not_found" };
  const pull = state.pulls[pi]!;
  if (
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= pull.cards.length
  ) {
    return { ok: false, code: "invalid_slot" };
  }
  const card = pull.cards[slotIndex]!;
  const coinsGained = cardSellCoins(card);
  pull.cards.splice(slotIndex, 1);
  if (pull.cards.length === 0) {
    state.pulls.splice(pi, 1);
  }
  rebuildSpareCopiesFromPulls(state);
  state.coins += coinsGained;
  return { ok: true, coinsGained };
}
