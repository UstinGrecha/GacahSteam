"use client";

import { syncAchievements } from "@/lib/achievements/sync";
import {
  defaultState,
  loadState,
  saveState,
} from "@/lib/storage/persist";
import { applyLoginStreak } from "@/lib/storage/streak";
import { addCardsToSpareCopies } from "@/lib/storage/spareCopies";
import type { PullRecord, StoredState } from "@/lib/storage/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  state: StoredState;
  refresh: () => void;
  commit: (mutate: (draft: StoredState) => void) => void;
  addPull: (pull: PullRecord) => void;
};

const StorageCtx = createContext<Ctx | null>(null);

function cloneState(s: StoredState): StoredState {
  return {
    ...s,
    pulls: s.pulls.map((p) => ({
      ...p,
      cards: p.cards.map((c) => ({ ...c })),
    })),
    achievements: Object.fromEntries(
      Object.entries(s.achievements).map(([k, v]) => [k, { ...v }]),
    ),
    daily: { ...s.daily },
    pity: { ...s.pity },
    spareCopies: { ...s.spareCopies },
  };
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(() => defaultState());

  const refresh = useCallback(() => {
    const s = loadState();
    applyLoginStreak(s);
    syncAchievements(s);
    saveState(s);
    setState(cloneState(s));
  }, []);

  const commit = useCallback((mutate: (draft: StoredState) => void) => {
    const s = loadState();
    applyLoginStreak(s);
    mutate(s);
    syncAchievements(s);
    saveState(s);
    setState(cloneState(s));
  }, []);

  const addPull = useCallback(
    (pull: PullRecord) => {
      commit((draft) => {
        draft.pulls.push(pull);
        addCardsToSpareCopies(draft, pull.cards);
      });
    },
    [commit],
  );

  useEffect(() => {
    void Promise.resolve().then(() => {
      refresh();
    });
  }, [refresh]);

  const value = useMemo(
    () => ({ state, refresh, commit, addPull }),
    [state, refresh, commit, addPull],
  );

  return (
    <StorageCtx.Provider value={value}>{children}</StorageCtx.Provider>
  );
}

export function useGameStorage(): Ctx {
  const v = useContext(StorageCtx);
  if (!v) throw new Error("useGameStorage requires StorageProvider");
  return v;
}
