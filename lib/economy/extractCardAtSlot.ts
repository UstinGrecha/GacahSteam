import { rebuildSpareCopiesFromPulls } from "@/lib/storage/spareCopies";
import type { StoredState } from "@/lib/storage/types";
import type { SteamCard } from "@/lib/gacha/types";

export type ExtractCardResult =
  | { ok: true; card: SteamCard }
  | { ok: false; code: "pull_not_found" | "invalid_slot" };

/** Убирает карту из коллекции без начисления монет (выставление на маркет). */
export function extractCardAtSlot(
  state: StoredState,
  pullId: string,
  slotIndex: number,
): ExtractCardResult {
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
  const copy: SteamCard = { ...card };
  pull.cards.splice(slotIndex, 1);
  if (pull.cards.length === 0) {
    state.pulls.splice(pi, 1);
  }
  rebuildSpareCopiesFromPulls(state);
  return { ok: true, card: copy };
}
