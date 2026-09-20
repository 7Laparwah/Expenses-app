/**
 * Offline-first two-way merge with Firebase.
 *
 * Flow (matches product spec):
 * 1. Local-first write → localStorage via Zustand (instant UI)
 * 2. If logged-in + online → push to Firestore with userId + savedAt
 * 3. On load / reconnect → merge local + cloud without data loss
 *
 * Security: every cloud doc carries userId; writes only for current user.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import type { Account, Entry, Goal, LedgerSnapshot, Party, Settings } from "./types";
import { getFirestoreDb, isFirebaseConfigured } from "./firebase";

export type CloudUser = { uid: string };

type CloudEntry = Entry & { userId: string; savedAt: string };
type CloudParty = Party & { userId: string; savedAt: string };
type CloudAccount = Account & { userId: string; savedAt: string };
type CloudGoal = Goal & { userId: string; savedAt: string };

function online(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

async function pushDoc(
  db: Firestore,
  col: string,
  id: string,
  data: Record<string, unknown>,
) {
  await setDoc(doc(db, col, id), data, { merge: true });
}

/** Save a single entry to Firebase (local already written by store). */
export async function saveEntryToFirebase(entry: Entry, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  const payload: CloudEntry = {
    ...entry,
    userId: user.uid,
    savedAt: new Date().toISOString(),
  };
  await pushDoc(db, "entries", entry.id, payload as unknown as Record<string, unknown>);
}

export async function deleteEntryFromFirebase(entryId: string, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  // Soft-delete locally; hard-delete on cloud when purge, or mark deletedAt
  try {
    await deleteDoc(doc(db, "entries", entryId));
  } catch {
    /* ignore if missing */
  }
  void user;
}

export async function savePartyToFirebase(party: Party, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  const payload: CloudParty = {
    ...party,
    userId: user.uid,
    savedAt: new Date().toISOString(),
  };
  await pushDoc(db, "parties", party.id, payload as unknown as Record<string, unknown>);
}

export async function saveAccountToFirebase(account: Account, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  const payload: CloudAccount = {
    ...account,
    userId: user.uid,
    savedAt: new Date().toISOString(),
  };
  await pushDoc(db, "accounts", account.id, payload as unknown as Record<string, unknown>);
}

export async function saveGoalToFirebase(goal: Goal, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  const payload: CloudGoal = {
    ...goal,
    userId: user.uid,
    savedAt: new Date().toISOString(),
  };
  await pushDoc(db, "goals", goal.id, payload as unknown as Record<string, unknown>);
}

export async function saveSettingsToFirebase(settings: Settings, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  const db = getFirestoreDb();
  if (!db) return;
  await pushDoc(db, "settings", user.uid, {
    ...settings,
    userId: user.uid,
    savedAt: new Date().toISOString(),
  });
}

/**
 * Two-way merge:
 * [Local Map] + [Cloud Set]
 * → unique by id
 * → local-only rows auto-upload
 * → final arrays sorted by date desc where applicable
 */
export async function loadAndMergeFromFirebase(
  local: LedgerSnapshot,
  user: CloudUser,
): Promise<LedgerSnapshot> {
  if (!isFirebaseConfigured() || !online()) return local;
  const db = getFirestoreDb();
  if (!db) return local;

  const loadCol = async <T extends { id: string }>(colName: string): Promise<T[]> => {
    const q = query(collection(db, colName), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as T & { userId?: string; savedAt?: string };
      // strip cloud-only fields for local shape
      const { userId: _u, savedAt: _s, ...rest } = data as T & {
        userId?: string;
        savedAt?: string;
      };
      return { ...rest, id: d.id } as T;
    });
  };

  const [cloudEntries, cloudParties, cloudAccounts, cloudGoals] = await Promise.all([
    loadCol<Entry>("entries"),
    loadCol<Party>("parties"),
    loadCol<Account>("accounts"),
    loadCol<Goal>("goals"),
  ]);

  // --- Entries merge ---
  const entryMap = new Map<string, Entry>();
  for (const e of local.entries) entryMap.set(e.id, e);
  const cloudEntryIds = new Set<string>();
  for (const e of cloudEntries) {
    cloudEntryIds.add(e.id);
    const localE = entryMap.get(e.id);
    if (!localE) {
      entryMap.set(e.id, e);
    } else {
      // prefer newer by date / deletedAt awareness — keep local if more recent edit not tracked;
      // simple: cloud wins if local not deleted and cloud has same id (last-write via merge uploads)
      entryMap.set(e.id, { ...e, ...localE, deletedAt: localE.deletedAt ?? e.deletedAt });
    }
  }
  // Auto-upload local-only
  for (const e of local.entries) {
    if (!cloudEntryIds.has(e.id)) {
      void saveEntryToFirebase(e, user);
    }
  }
  const mergedEntries = Array.from(entryMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  // --- Parties ---
  const partyMap = new Map<string, Party>();
  for (const p of local.parties) partyMap.set(p.id, p);
  const cloudPartyIds = new Set<string>();
  for (const p of cloudParties) {
    cloudPartyIds.add(p.id);
    partyMap.set(p.id, partyMap.get(p.id) ?? p);
  }
  for (const p of local.parties) {
    if (!cloudPartyIds.has(p.id)) void savePartyToFirebase(p, user);
  }

  // --- Accounts ---
  const accountMap = new Map<string, Account>();
  for (const a of local.accounts) accountMap.set(a.id, a);
  const cloudAccountIds = new Set<string>();
  for (const a of cloudAccounts) {
    cloudAccountIds.add(a.id);
    accountMap.set(a.id, accountMap.get(a.id) ?? a);
  }
  for (const a of local.accounts) {
    if (!cloudAccountIds.has(a.id)) void saveAccountToFirebase(a, user);
  }

  // --- Goals ---
  const goalMap = new Map<string, Goal>();
  for (const g of local.goals) goalMap.set(g.id, g);
  const cloudGoalIds = new Set<string>();
  for (const g of cloudGoals) {
    cloudGoalIds.add(g.id);
    goalMap.set(g.id, goalMap.get(g.id) ?? g);
  }
  for (const g of local.goals) {
    if (!cloudGoalIds.has(g.id)) void saveGoalToFirebase(g, user);
  }

  // Settings doc
  void saveSettingsToFirebase(local.settings, user);

  return {
    entries: mergedEntries,
    parties: Array.from(partyMap.values()),
    accounts: Array.from(accountMap.values()),
    goals: Array.from(goalMap.values()),
    settings: local.settings,
  };
}

/** Push entire local snapshot (used after login / manual sync). */
export async function pushFullSnapshot(snap: LedgerSnapshot, user: CloudUser): Promise<void> {
  if (!isFirebaseConfigured() || !online()) return;
  await Promise.all([
    ...snap.entries.map((e) => saveEntryToFirebase(e, user)),
    ...snap.parties.map((p) => savePartyToFirebase(p, user)),
    ...snap.accounts.map((a) => saveAccountToFirebase(a, user)),
    ...snap.goals.map((g) => saveGoalToFirebase(g, user)),
    saveSettingsToFirebase(snap.settings, user),
  ]);
}
