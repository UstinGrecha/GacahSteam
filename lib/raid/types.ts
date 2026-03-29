import type { SteamCard } from "@/lib/gacha/types";

/** Уникальный слот коллекции: пул + индекс карты в пуле. */
export type RaidCardPick = {
  pullId: string;
  slotIndex: number;
  card: SteamCard;
};

export type RaidBossStats = {
  weekKey: string;
  nameKey: string;
  maxHp: number;
  atk: number;
  def: number;
};

export type RaidPartyMember = {
  pullId: string;
  slotIndex: number;
  card: SteamCard;
  hp: number;
  maxHp: number;
};

export type RaidLogEntry =
  | {
      kind: "player_attack";
      actor: string;
      damage: number;
      bossHpAfter: number;
      slot: number;
      heal?: number;
    }
  | {
      kind: "boss_slaughter";
      hits: { name: string; damage: number; hpAfter: number; slot: number }[];
      enraged: boolean;
    }
  | { kind: "victory" }
  | { kind: "defeat" };

export type RaidRunState = {
  boss: RaidBossStats;
  bossHp: number;
  party: RaidPartyMember[];
  /** Индекс атакующей карты в фазе отряда (0–4). */
  activeSlot: number;
  /** Фаза: игроки бьют по очереди, затем удар босса. */
  phase: "heroes" | "boss";
  outcome: "ongoing" | "victory" | "defeat";
  log: RaidLogEntry[];
  round: number;
};
