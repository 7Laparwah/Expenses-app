import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account,
  Entry,
  EntryType,
  Goal,
  LedgerSnapshot,
  Party,
  Settings,
} from "./types";
import { createSeed } from "./seed";
import { uid } from "./utils";
import { liveEntries } from "./format";
import type { CloudUser } from "./firebase-sync";
import {
  saveEntryToFirebase,
  deleteEntryFromFirebase,
  savePartyToFirebase,
  saveAccountToFirebase,
  saveGoalToFirebase,
  saveSettingsToFirebase,
} from "./firebase-sync";

/** Optional Firebase user setter — call from auth layer when user logs in */
let firebaseUser: CloudUser | null = null;
export function setFirebaseUser(user: CloudUser | null) {
  firebaseUser = user;
}
export function getFirebaseUser() {
  return firebaseUser;
}


interface LedgerActions {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  addEntry: (input: Omit<Entry, "id">) => string;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  restoreEntry: (id: string) => void;
  purgeEntry: (id: string) => void;
  addParty: (input: Omit<Party, "id">) => string;
  updateParty: (id: string, patch: Partial<Party>) => void;
  deleteParty: (id: string) => void;
  addAccount: (input: Omit<Account, "id">) => string;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addGoal: (input: Omit<Goal, "id" | "status">) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  completeGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  importSnapshot: (snap: LedgerSnapshot) => void;
  resetAll: () => void;
}

export type LedgerStore = LedgerSnapshot & LedgerActions;

const seed = createSeed();

export const useLedger = create<LedgerStore>()(
  persist(
    (set) => ({
      ...seed,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      addEntry: (input) => {
        const id = uid("e");
        const entry = { ...input, id };
        set((s) => ({ entries: [...s.entries, entry] }));
        if (firebaseUser) void saveEntryToFirebase(entry, firebaseUser);
        return id;
      },
      updateEntry: (id, patch) =>
        set((s) => {
          const entries = s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
          const updated = entries.find((e) => e.id === id);
          if (updated && firebaseUser) void saveEntryToFirebase(updated, firebaseUser);
          return { entries };
        }),
      deleteEntry: (id) =>
        set((s) => {
          const entries = s.entries.map((e) =>
            e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e,
          );
          const updated = entries.find((e) => e.id === id);
          if (updated && firebaseUser) void saveEntryToFirebase(updated, firebaseUser);
          return { entries };
        }),
      restoreEntry: (id) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, deletedAt: undefined } : e,
          ),
        })),
      purgeEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        if (firebaseUser) void deleteEntryFromFirebase(id, firebaseUser);
      },
      addParty: (input) => {
        const id = uid("p");
        const party = { ...input, id };
        set((s) => ({ parties: [...s.parties, party] }));
        if (firebaseUser) void savePartyToFirebase(party, firebaseUser);
        return id;
      },
      updateParty: (id, patch) =>
        set((s) => ({
          parties: s.parties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteParty: (id) =>
        set((s) => ({ parties: s.parties.filter((p) => p.id !== id) })),
      addAccount: (input) => {
        const id = uid("a");
        const account = { ...input, id };
        set((s) => ({ accounts: [...s.accounts, account] }));
        if (firebaseUser) void saveAccountToFirebase(account, firebaseUser);
        return id;
      },
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      addGoal: (input) => {
        const id = uid("g");
        const goal = { ...input, id, status: "active" as const };
        set((s) => ({
          goals: [...s.goals, goal],
        }));
        if (firebaseUser) void saveGoalToFirebase(goal, firebaseUser);
        return id;
      },
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      completeGoal: (id) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? { ...g, status: "completed", completedAt: new Date().toISOString() }
              : g,
          ),
        })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      patchSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          if (firebaseUser) void saveSettingsToFirebase(settings, firebaseUser);
          return { settings };
        }),
      importSnapshot: (snap) =>
        set({
          parties: snap.parties,
          accounts: snap.accounts,
          entries: snap.entries,
          goals: snap.goals,
          settings: { ...seed.settings, ...snap.settings },
        }),
      resetAll: () => set({ ...createSeed(), hydrated: true }),
    }),
    {
      name: "khata-ledger-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        parties: s.parties,
        accounts: s.accounts,
        entries: s.entries,
        goals: s.goals,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function goalSpent(goal: Goal, entries: Entry[]) {
  // Order-independent auto-link: all expenses to goal.partyId count as saved
  return liveEntries(entries)
    .filter((e) => e.partyId === goal.partyId && e.type !== "receive")
    .reduce((sum, e) => sum + e.amount, 0);
}

export function inferType(party: Party | undefined, fallback: EntryType): EntryType {
  if (party?.kind === "savings") return "transfer";
  return fallback;
}
