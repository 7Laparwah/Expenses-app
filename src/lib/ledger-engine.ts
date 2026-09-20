/**
 * SHIVA Ledger Engine
 * Implements exact formulas from product spec:
 * - Net Balance, method-wise wallets
 * - Party vs Category (udhaar vs routine expense)
 * - Receivables / Payables
 * - Monthly budget warning
 * - Investment-aware Savings
 * - Goals auto-link + lifecycle
 */
import {
  endOfMonth,
  parseISO,
  startOfMonth,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";
import type { Account, Entry, EntryType, Goal, Party, Settings } from "./types";
import { liveEntries, monthEntries, totals } from "./format";

/* ------------------------------------------------------------------ */
/* 1. ROUTINE EXPENSE KEYWORDS (Party vs Category)                    */
/* ------------------------------------------------------------------ */
export const ROUTINE_KEYWORDS = [
  "food",
  "petrol",
  "fuel",
  "auto",
  "medicine",
  "kirana",
  "rent",
  "recharge",
  "bills",
  "office",
  "emi",
  "salary",
  "other-income",
  "other income",
  "chai",
  "snacks",
  "lunch",
  "pharmacy",
] as const;

export const INVESTMENT_KEYWORDS = [
  "groww",
  "mutual fund",
  "mutualfund",
  "sip",
  "investment",
  "apj emi",
  "stocks",
  "stock",
  "mf",
  "other-investment",
  "other investment",
  "gullak",
] as const;

/** True if name looks like a routine personal expense category (not a real person). */
export function isRoutineCategory(name: string): boolean {
  const n = name.toLowerCase().trim();
  return ROUTINE_KEYWORDS.some((k) => n === k || n.includes(k));
}

/** True if party/name is an investment vehicle. */
export function isInvestmentName(name: string): boolean {
  const n = name.toLowerCase().trim();
  return INVESTMENT_KEYWORDS.some((k) => n === k || n.includes(k));
}

/** Classify party: person (udhaar), category (routine), savings (investment). */
export function classifyParty(party: Party | undefined, fallbackName?: string): "person" | "category" | "savings" {
  if (party?.kind) return party.kind;
  const name = (party?.name || fallbackName || "").toLowerCase();
  if (isInvestmentName(name)) return "savings";
  if (isRoutineCategory(name)) return "category";
  return "person";
}

/* ------------------------------------------------------------------ */
/* 2. CORE BALANCES                                                   */
/* ------------------------------------------------------------------ */

/**
 * Total Net Balance (Lifetime)
 * Net = Σ Income − Σ Expense  (transfers/savings treated as outflow for net cash)
 * Green if > 0, Red if < 0
 */
export function netBalance(entries: Entry[]): number {
  return totals(entries).balance;
}

/**
 * Payment-method wise wallet balances.
 * Cash / UPI / Bank = Income on that method − Expense on that method
 */
export function walletBalances(
  entries: Entry[],
  accounts: Account[],
): { id: string; name: string; balance: number; color: string }[] {
  const income: Record<string, number> = {};
  const expense: Record<string, number> = {};

  for (const e of liveEntries(entries)) {
    if (e.type === "receive") {
      income[e.accountId] = (income[e.accountId] ?? 0) + e.amount;
    } else {
      // payment + transfer both reduce the wallet
      expense[e.accountId] = (expense[e.accountId] ?? 0) + e.amount;
    }
  }

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    balance: (income[a.id] ?? 0) - (expense[a.id] ?? 0),
  }));
}

/**
 * Current Month Growth % (Income)
 * (Current Month Income − Previous Month Income) / Previous Month Income × 100
 */
export function monthIncomeGrowthPct(entries: Entry[], now = new Date()): { pct: number; up: boolean; current: number; previous: number } {
  const thisM = monthEntries(entries, now);
  const prevM = monthEntries(entries, new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const current = totals(thisM).receive;
  const previous = totals(prevM).receive;
  if (previous === 0) {
    return { pct: current === 0 ? 0 : 100, up: current > 0, current, previous };
  }
  const pct = ((current - previous) / previous) * 100;
  return { pct, up: pct >= 0, current, previous };
}

/* ------------------------------------------------------------------ */
/* 3. RECEIVABLES & PAYABLES (Udhaar)                                 */
/* ------------------------------------------------------------------ */

export interface PartyBalanceRow {
  partyId: string;
  name: string;
  icon: string;
  color: string;
  kind: Party["kind"];
  /** Σ receive from party − Σ payment/transfer to party */
  balance: number;
  /** balance > 0 → receivables (kisse lena), < 0 → payables (kisko dena) */
}

/**
 * Party Balance = Σ(Income from Party) − Σ(Expense to Party)
 * Only real persons (kind=person) are included in udhaar lists.
 * Routine categories are excluded so personal spend does not pollute udhaar.
 */
export function partyBalances(entries: Entry[], parties: Party[]): PartyBalanceRow[] {
  const by: Record<string, { receive: number; payment: number }> = {};

  for (const e of liveEntries(entries)) {
    if (!by[e.partyId]) by[e.partyId] = { receive: 0, payment: 0 };
    if (e.type === "receive") by[e.partyId].receive += e.amount;
    else by[e.partyId].payment += e.amount;
  }

  return parties
    .map((p) => {
      const b = by[p.id] ?? { receive: 0, payment: 0 };
      return {
        partyId: p.id,
        name: p.name,
        icon: p.icon,
        color: p.color,
        kind: p.kind,
        balance: b.receive - b.payment,
      };
    })
    .filter((r) => r.kind === "person"); // only real contacts for udhaar
}

/** Kisse paise lene hain (balance > 0) */
export function receivables(entries: Entry[], parties: Party[]): PartyBalanceRow[] {
  return partyBalances(entries, parties)
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}

/** Kisko paise dene hain (balance < 0); amount shown as positive owed */
export function payables(entries: Entry[], parties: Party[]): PartyBalanceRow[] {
  return partyBalances(entries, parties)
    .filter((r) => r.balance < 0)
    .sort((a, b) => a.balance - b.balance);
}

/* ------------------------------------------------------------------ */
/* 4. MONTHLY BUDGET WARNING                                          */
/* ------------------------------------------------------------------ */

export type BudgetLevel = "ok" | "warning" | "critical";

export function budgetStatus(
  entries: Entry[],
  settings: Pick<Settings, "monthlyBudget">,
  now = new Date(),
): { used: number; limit: number; pct: number; level: BudgetLevel } {
  const limit = settings.monthlyBudget || 0;
  const used = totals(monthEntries(entries, now)).outflow;
  const pct = limit <= 0 ? 0 : (used / limit) * 100;
  let level: BudgetLevel = "ok";
  if (pct >= 100) level = "critical";
  else if (pct >= 80) level = "warning";
  return { used, limit, pct, level };
}

/* ------------------------------------------------------------------ */
/* 5. SAVINGS & INVESTMENT                                            */
/* ------------------------------------------------------------------ */

/**
 * Total Savings = Σ(Expense on Investments) − Σ(Income from Investments)
 * Floor at 0 (never negative).
 * Investment parties: kind=savings OR name matches INVESTMENT_KEYWORDS.
 */
export function totalSavings(entries: Entry[], parties: Party[]): number {
  const invIds = new Set(
    parties
      .filter((p) => p.kind === "savings" || isInvestmentName(p.name))
      .map((p) => p.id),
  );

  let invested = 0; // money put in (expense/transfer)
  let withdrawn = 0; // money taken out (receive)

  for (const e of liveEntries(entries)) {
    if (!invIds.has(e.partyId)) continue;
    if (e.type === "receive") withdrawn += e.amount;
    else invested += e.amount;
  }

  return Math.max(0, invested - withdrawn);
}

/* ------------------------------------------------------------------ */
/* 6. GOALS — Order-Independent Auto-Linking                          */
/* ------------------------------------------------------------------ */

/**
 * Goal Saved Amount =
 *   Manual contributions (if any stored on goal) +
 *   Σ(All Expenses where partyId === goal.partyId)
 *
 * Order-independent: works even if entry was created before the goal.
 */
export function goalSavedAmount(goal: Goal, entries: Entry[]): number {
  const linked = liveEntries(entries)
    .filter((e) => e.partyId === goal.partyId && e.type !== "receive")
    .reduce((sum, e) => sum + e.amount, 0);
  // Future: if Goal gains manualContributions field, add it here
  return linked;
}

export function goalProgress(goal: Goal, entries: Entry[]): {
  saved: number;
  target: number;
  remaining: number;
  pct: number;
  status: Goal["status"] | "ended";
} {
  const saved = goalSavedAmount(goal, entries);
  const target = goal.targetAmount;
  const remaining = Math.max(0, target - saved);
  const pct = target <= 0 ? 0 : Math.min(100, Math.round((saved / target) * 100));

  const today = new Date();
  const targetDate = parseISO(goal.targetDate);

  let status: Goal["status"] | "ended" = goal.status;
  if (saved >= target) {
    status = "completed";
  } else if (isAfter(today, endOfMonth(targetDate)) || (isAfter(today, targetDate) && !isEqual(today, targetDate))) {
    // deadline passed and not completed
    if (goal.status !== "completed") status = "ended";
  } else {
    status = "active";
  }

  return { saved, target, remaining, pct, status };
}

/** Canvas ring start/end angles: start at -π/2, sweep 2π × pct/100 */
export function goalRingAngles(pct: number): { start: number; end: number } {
  const start = -Math.PI / 2;
  const end = start + 2 * Math.PI * (Math.min(100, Math.max(0, pct)) / 100);
  return { start, end };
}

/**
 * Derive live goal statuses for UI (does not mutate store).
 * Completed when saved >= target; Ended when past targetDate and not completed.
 */
export function deriveGoalStatuses(goals: Goal[], entries: Entry[]): Array<Goal & { saved: number; pct: number; remaining: number; derivedStatus: Goal["status"] | "ended" }> {
  return goals.map((g) => {
    const p = goalProgress(g, entries);
    return {
      ...g,
      saved: p.saved,
      pct: p.pct,
      remaining: p.remaining,
      derivedStatus: p.status,
    };
  });
}

/** True when there are past goals but zero currently active ones → show "new month goal" prompt */
export function shouldPromptNewGoal(goals: Goal[], entries: Entry[]): boolean {
  const derived = deriveGoalStatuses(goals, entries);
  const active = derived.filter((g) => g.derivedStatus === "active");
  const past = derived.filter((g) => g.derivedStatus === "completed" || g.derivedStatus === "ended");
  return active.length === 0 && past.length > 0;
}

/* ------------------------------------------------------------------ */
/* 7. HELPERS for AI context / dashboard                              */
/* ------------------------------------------------------------------ */

export function ledgerSnapshotSummary(
  entries: Entry[],
  parties: Party[],
  accounts: Account[],
  settings: Settings,
) {
  const net = netBalance(entries);
  const wallets = walletBalances(entries, accounts);
  const recv = receivables(entries, parties);
  const pay = payables(entries, parties);
  const savings = totalSavings(entries, parties);
  const budget = budgetStatus(entries, settings);
  const growth = monthIncomeGrowthPct(entries);

  return {
    net,
    wallets,
    receivables: recv,
    payables: pay,
    savings,
    budget,
    growth,
  };
}
