import { computeCardHp } from "@/lib/gacha/stats";
import type { SteamCard } from "@/lib/gacha/types";
import {
  bossEnrageDamageMult,
  isBossEnraged,
  raidIncomingDamageMult,
  raidLifestealHeal,
  raidOutgoingDamageMult,
} from "./traitModifiers";
import type {
  RaidBossStats,
  RaidCardPick,
  RaidLogEntry,
  RaidPartyMember,
  RaidRunState,
} from "./types";

function cardCombatHp(c: SteamCard): number {
  if (typeof c.hp === "number" && c.hp >= 40) return c.hp;
  return computeCardHp(c.atk, c.def, c.score);
}

/** Базовый урон карты по боссу (без трейтов). */
export function playerDamageToBoss(card: SteamCard, boss: RaidBossStats): number {
  const raw = Math.round(card.atk * 1.22 - boss.def * 0.28);
  return Math.max(1, raw);
}

/** Базовый удар босса по карте (без ярости и трейтов). */
export function bossDamageToCard(
  boss: RaidBossStats,
  card: SteamCard,
): number {
  const raw = Math.round(boss.atk * 1.32 - card.def * 0.34);
  return Math.max(1, raw);
}

export function createRaidRun(
  boss: RaidBossStats,
  picks: RaidCardPick[],
): RaidRunState {
  if (picks.length !== 5) {
    throw new Error("raid_requires_five_cards");
  }
  const party: RaidPartyMember[] = picks.map((p) => {
    const hp0 = cardCombatHp(p.card);
    return {
      pullId: p.pullId,
      slotIndex: p.slotIndex,
      card: p.card,
      hp: hp0,
      maxHp: hp0,
    };
  });
  return {
    boss,
    bossHp: boss.maxHp,
    party,
    activeSlot: 0,
    phase: "heroes",
    outcome: "ongoing",
    log: [],
    round: 1,
  };
}

function aliveIndices(party: RaidPartyMember[]): number[] {
  return party.map((m, i) => (m.hp > 0 ? i : -1)).filter((i) => i >= 0);
}

/**
 * Один шаг пошаговой битвы: один удар героя или полная фаза босса.
 * Возвращает новое состояние (иммутабельная копия).
 */
export function advanceRaidStep(state: RaidRunState): RaidRunState {
  if (state.outcome !== "ongoing") return state;

  const log = [...state.log];
  let {
    bossHp,
    party,
    activeSlot,
    phase,
    round,
  }: RaidRunState = { ...state, party: state.party.map((m) => ({ ...m })) };

  if (phase === "heroes") {
    const alive = aliveIndices(party);
    if (alive.length === 0) {
      log.push({ kind: "defeat" });
      return { ...state, outcome: "defeat", log };
    }
    if (!alive.includes(activeSlot)) {
      activeSlot = alive[0]!;
    }

    const actor = party[activeSlot]!;
    if (actor.hp <= 0) {
      return advanceRaidStep({
        ...state,
        party,
        activeSlot: alive[0]!,
        phase: "heroes",
        log,
        round,
      });
    }

    const baseDmg = playerDamageToBoss(actor.card, state.boss);
    const dmg = Math.max(
      1,
      Math.round(baseDmg * raidOutgoingDamageMult(actor.card)),
    );
    bossHp = Math.max(0, bossHp - dmg);
    const heal = raidLifestealHeal(actor.card, dmg);
    if (heal > 0) {
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
    }
    const entry: RaidLogEntry = {
      kind: "player_attack",
      actor: actor.card.name,
      damage: dmg,
      bossHpAfter: bossHp,
      slot: activeSlot,
      ...(heal > 0 ? { heal } : {}),
    };
    log.push(entry);

    if (bossHp <= 0) {
      log.push({ kind: "victory" });
      return {
        ...state,
        bossHp: 0,
        party,
        phase: "heroes",
        outcome: "victory",
        log,
        round,
      };
    }

    const nextAliveAfter = alive.filter((i) => i > activeSlot);
    if (nextAliveAfter.length > 0) {
      activeSlot = nextAliveAfter[0]!;
      return {
        ...state,
        bossHp,
        party,
        phase: "heroes",
        activeSlot,
        outcome: "ongoing",
        log,
        round,
      };
    }
    return {
      ...state,
      bossHp,
      party,
      phase: "boss",
      activeSlot: 0,
      outcome: "ongoing",
      log,
      round,
    };
  }

  const enrMult = bossEnrageDamageMult(bossHp, state.boss.maxHp);
  const hits: RaidLogEntry = {
    kind: "boss_slaughter",
    hits: [],
    enraged: isBossEnraged(bossHp, state.boss.maxHp),
  };
  for (let i = 0; i < party.length; i++) {
    const m = party[i]!;
    if (m.hp <= 0) continue;
    const base = bossDamageToCard(state.boss, m.card);
    const d = Math.max(
      1,
      Math.round(base * raidIncomingDamageMult(m.card) * enrMult),
    );
    m.hp = Math.max(0, m.hp - d);
    hits.hits.push({
      name: m.card.name,
      damage: d,
      hpAfter: m.hp,
      slot: i,
    });
  }
  log.push(hits);

  if (aliveIndices(party).length === 0) {
    log.push({ kind: "defeat" });
    return {
      ...state,
      bossHp,
      party,
      phase: "heroes",
      outcome: "defeat",
      log,
      round,
    };
  }

  round += 1;
  activeSlot = aliveIndices(party)[0]!;
  return {
    ...state,
    bossHp,
    party,
    phase: "heroes",
    activeSlot,
    outcome: "ongoing",
    log,
    round,
  };
}

/** Прогнать бой до конца (для тестов и быстрого предпросмотра). */
export function simulateRaidToEnd(
  boss: RaidBossStats,
  picks: RaidCardPick[],
  maxSteps = 5000,
): RaidRunState {
  let s = createRaidRun(boss, picks);
  let n = 0;
  while (s.outcome === "ongoing" && n < maxSteps) {
    s = advanceRaidStep(s);
    n += 1;
  }
  return s;
}
