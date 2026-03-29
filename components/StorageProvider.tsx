"use client";

import { syncAchievements } from "@/lib/achievements/sync";
import { economySync } from "@/lib/economy/sync";
import {
  defaultState,
  hydrateStoredStateFromApi,
  loadState,
  migrateGuestSaveToUserIfNeeded,
  saveState,
  setPersistUserScope,
} from "@/lib/storage/persist";
import { applyLoginStreak } from "@/lib/storage/streak";
import { addCardsToSpareCopies } from "@/lib/storage/spareCopies";
import type { PullRecord, StoredState } from "@/lib/storage/types";
import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type GameStorageCtx = {
  state: StoredState;
  /** Серверный сейв (БД): паки, монеты, переработка только через API */
  serverAuthoritative: boolean;
  refresh: () => Promise<void>;
  commit: (mutate: (draft: StoredState) => void) => void;
  addPull: (pull: PullRecord) => void;
};

const StorageCtx = createContext<GameStorageCtx | null>(null);

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
    hourly: { ...s.hourly },
    pity: { ...s.pity },
    spareCopies: { ...s.spareCopies },
    raid: s.raid ? { ...s.raid } : { lastRewardWeekKey: null },
  };
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<StoredState>(() => defaultState());
  const [serverAuthoritative, setServerAuthoritative] = useState(false);
  const lastScopeRef = useRef<string | null>(null);
  const serverAuthRef = useRef(false);
  serverAuthRef.current = serverAuthoritative;

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (status === "loading") return;

    if (status === "authenticated" && session?.user?.id) {
      try {
        const r = await fetch("/api/game/state", { credentials: "same-origin" });
        if (r.ok) {
          const j = (await r.json()) as { state: unknown };
          let parsed = hydrateStoredStateFromApi(j.state);
          if (parsed.pulls.length === 0) {
            const local = loadState();
            if (local.pulls.length > 0) {
              const m = await fetch("/api/game/migrate", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(local),
              });
              if (m.ok) {
                const mj = (await m.json()) as { state: unknown };
                parsed = hydrateStoredStateFromApi(mj.state);
              }
            }
          }
          setState(cloneState(parsed));
          setServerAuthoritative(true);
          return;
        }
      } catch {
        /* fallback local */
      }
      setServerAuthoritative(false);
    } else {
      setServerAuthoritative(false);
    }

    const s = loadState();
    applyLoginStreak(s);
    economySync(s);
    syncAchievements(s);
    saveState(s);
    setState(cloneState(s));
  }, [session?.user?.id, status]);

  const commit = useCallback((mutate: (draft: StoredState) => void) => {
    if (serverAuthRef.current) return;
    const s = loadState();
    applyLoginStreak(s);
    economySync(s);
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
    if (status === "loading") return;
    void refresh();
  }, [refresh, status]);

  useEffect(() => {
    if (status === "loading") return;
    const userId =
      status === "authenticated" && session?.user?.id
        ? session.user.id
        : null;
    setPersistUserScope(userId);
    const scopeKey = userId ?? "guest";
    if (userId && lastScopeRef.current !== scopeKey) {
      migrateGuestSaveToUserIfNeeded(userId);
    }
    lastScopeRef.current = scopeKey;
    queueMicrotask(() => {
      void refresh();
    });
  }, [session?.user?.id, status, refresh]);

  const value = useMemo(
    () => ({
      state,
      serverAuthoritative,
      refresh,
      commit,
      addPull,
    }),
    [state, serverAuthoritative, refresh, commit, addPull],
  );

  return (
    <StorageCtx.Provider value={value}>{children}</StorageCtx.Provider>
  );
}

export function useGameStorage(): GameStorageCtx {
  const v = useContext(StorageCtx);
  if (!v) throw new Error("useGameStorage requires StorageProvider");
  return v;
}
