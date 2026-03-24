export type PackKind = "standard" | "budget" | "premium";

/** null — только дневные бесплатные попытки, не продаётся за монеты */
const COIN_BY_KIND: Record<PackKind, number | null> = {
  standard: null,
  budget: 20,
  premium: 40,
};

export function packCoinCost(kind: PackKind): number | null {
  return COIN_BY_KIND[kind];
}

/** Добавка к «культовому» score; редкость от неё не зависит — только положение внутри полосы тира. */
export function packScoreDelta(kind: PackKind): number {
  switch (kind) {
    case "budget":
      return -11;
    case "premium":
      return 10;
    default:
      return 0;
  }
}
