import { format, parseISO } from "date-fns";
import type { LedgerSnapshot } from "./types";
import { compactMonth, inr, liveEntries, monthEntries, partyName, totals } from "./format";
import {
  budgetStatus,
  monthIncomeGrowthPct,
  netBalance,
  payables,
  receivables,
  totalSavings,
  walletBalances,
} from "./ledger-engine";
import { goalSpent } from "./store";

export function buildAiContext(snap: Pick<LedgerSnapshot, "entries" | "parties" | "goals" | "settings" | "accounts">) {
  const t = totals(snap.entries);
  const month = monthEntries(snap.entries, new Date());
  const mt = totals(month);
  const net = netBalance(snap.entries);
  const wallets = walletBalances(snap.entries, snap.accounts);
  const recv = receivables(snap.entries, snap.parties);
  const pay = payables(snap.entries, snap.parties);
  const savings = totalSavings(snap.entries, snap.parties);
  const budget = budgetStatus(snap.entries, snap.settings);
  const growth = monthIncomeGrowthPct(snap.entries);

  const recent = liveEntries(snap.entries)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map((e) => {
      const sign = e.type === "receive" ? "+" : "-";
      return `${format(parseISO(e.date), "d MMM")} ${sign}${e.amount} ${partyName(snap.parties, e.partyId)} (${e.type}) ${e.notes}`.trim();
    });

  const goals = snap.goals
    .filter((g) => g.status === "active" || g.status === "completed")
    .map((g) => `${g.name} ${goalSpent(g, snap.entries)}/${g.targetAmount} [${g.status}]`);

  const walletLine = wallets.map((w) => `${w.name}: ${inr(w.balance)}`).join("; ");
  const recvLine =
    recv.length === 0
      ? "none"
      : recv.map((r) => `${r.name} ${inr(r.balance)}`).join("; ");
  const payLine =
    pay.length === 0
      ? "none"
      : pay.map((r) => `${r.name} ${inr(Math.abs(r.balance))}`).join("; ");

  return [
    `Name: ${snap.settings.displayName || "Friend"}`,
    `Net Balance (lifetime): ${inr(net)} | All-time receive ${inr(t.receive)}; payment ${inr(t.payment)}; transfers/savings ${inr(t.savings)}`,
    `Wallets: ${walletLine}`,
    `${compactMonth(new Date())}: receive ${inr(mt.receive)}; outflow ${inr(mt.outflow)}; budget ${inr(snap.settings.monthlyBudget)} (used ${budget.pct.toFixed(0)}% → ${budget.level})`,
    `Income growth vs last month: ${growth.pct.toFixed(1)}% (${growth.up ? "up" : "down"})`,
    `Savings (investments): ${inr(savings)}`,
    `Receivables (kisse lena): ${recvLine}`,
    `Payables (kisko dena): ${payLine}`,
    `Accounts: ${snap.accounts.map((a) => a.name).join(", ")}`,
    `Parties: ${snap.parties.map((p) => `${p.name}(${p.kind})`).join(", ")}`,
    `Goals: ${goals.join("; ") || "none"}`,
    `Recent: ${recent.join(" | ")}`,
  ].join("\n");
}
