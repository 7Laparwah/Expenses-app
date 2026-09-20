import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
} from "date-fns";
import type { Entry, EntryType, Party } from "./types";

export function inr(
  n: number,
  opts?: { hide?: boolean; sign?: boolean; digits?: number },
) {
  if (opts?.hide) return "₹••••";
  const abs = Math.abs(n);
  const digits =
    opts?.digits ?? (Number.isInteger(abs) ? 0 : 2);
  const body = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(abs);
  if (opts?.sign) {
    if (n > 0) return `+ ₹${body}`;
    if (n < 0) return `- ₹${body}`;
  }
  return `₹${body}`;
}

export function dayHeading(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return `Today, ${format(d, "EEE, d MMM")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "EEE, d MMM")}`;
  return format(d, "d MMM yyyy");
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning, have a great day.";
  if (h < 17) return "Good afternoon, keep going.";
  return "Good evening, rest well.";
}

export function liveEntries(entries: Entry[]) {
  return entries.filter((e) => !e.deletedAt);
}

export function totals(entries: Entry[]) {
  let receive = 0;
  let payment = 0;
  let transfer = 0;
  for (const e of liveEntries(entries)) {
    if (e.type === "receive") receive += e.amount;
    else if (e.type === "transfer") transfer += e.amount;
    else payment += e.amount;
  }
  return {
    receive,
    payment,
    transfer,
    savings: transfer,
    outflow: payment + transfer,
    balance: receive - payment - transfer,
  };
}

export function inRange(entries: Entry[], from: Date, to: Date) {
  const a = from.getTime();
  const b = to.getTime();
  return liveEntries(entries).filter((e) => {
    const t = parseISO(e.date).getTime();
    return t >= a && t <= b;
  });
}

export function monthEntries(entries: Entry[], month: Date) {
  return inRange(entries, startOfMonth(month), endOfMonth(month));
}

export function withRunningBalance(entries: Entry[]) {
  const live = liveEntries(entries)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let bal = 0;
  return live.map((e) => {
    if (e.type === "receive") bal += e.amount;
    else bal -= e.amount;
    return { ...e, balance: bal };
  });
}

export function groupByDay(entries: Array<Entry & { balance: number }>) {
  const groups: { key: string; label: string; items: typeof entries }[] = [];
  for (const e of entries) {
    const key = format(parseISO(e.date), "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: dayHeading(e.date), items: [e] });
  }
  return groups;
}

export function partyName(parties: Party[], id: string) {
  return parties.find((p) => p.id === id)?.name ?? "Unknown";
}

export function methodSplit(entries: Entry[], accounts: { id: string; name: string; color: string }[]) {
  const by: Record<string, number> = {};
  let total = 0;
  for (const e of liveEntries(entries)) {
    if (e.type === "receive") continue;
    by[e.accountId] = (by[e.accountId] ?? 0) + e.amount;
    total += e.amount;
  }
  return accounts.map((a) => ({
    ...a,
    amount: by[a.id] ?? 0,
    pct: total === 0 ? 0 : ((by[a.id] ?? 0) / total) * 100,
  }));
}

export function partyBreakdown(entries: Entry[], parties: Party[], type: EntryType | "outflow" = "payment") {
  const by: Record<string, number> = {};
  let total = 0;
  for (const e of liveEntries(entries)) {
    const match =
      type === "outflow"
        ? e.type !== "receive"
        : e.type === type;
    if (!match) continue;
    by[e.partyId] = (by[e.partyId] ?? 0) + e.amount;
    total += e.amount;
  }
  const rows = Object.entries(by)
    .map(([partyId, amount]) => {
      const party = parties.find((p) => p.id === partyId);
      return {
        partyId,
        name: party?.name ?? "Unknown",
        color: party?.color ?? "#888",
        icon: party?.icon ?? "user",
        amount,
        pct: total === 0 ? 0 : (amount / total) * 100,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  return { total, rows };
}

export function weeklyTrend(entries: Entry[], month: Date, type: EntryType | "outflow") {
  const start = startOfMonth(month);
  const weeks: { label: string; amount: number }[] = [
    { label: "W1", amount: 0 },
    { label: "W2", amount: 0 },
    { label: "W3", amount: 0 },
    { label: "W4", amount: 0 },
    { label: "W5", amount: 0 },
  ];
  for (const e of monthEntries(entries, month)) {
    const match = type === "outflow" ? e.type !== "receive" : e.type === type;
    if (!match) continue;
    const d = parseISO(e.date);
    const week = Math.min(4, Math.floor((d.getDate() - 1) / 7));
    weeks[week].amount += e.amount;
  }
  const last = weeks[4];
  if (last && last.amount === 0 && !isSameMonth(addDays(startOfWeek(addDays(start, 28)), 0), month)) {
    weeks.pop();
  }
  if (weeks[4] && weeks[4].amount === 0) weeks.pop();
  return weeks;
}

export function vsLastMonth(entries: Entry[], type: EntryType | "outflow") {
  const now = new Date();
  const thisM = monthEntries(entries, now);
  const last = monthEntries(entries, new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sum = (list: Entry[]) =>
    list.reduce((acc, e) => {
      const match = type === "outflow" ? e.type !== "receive" : e.type === type;
      return match ? acc + e.amount : acc;
    }, 0);
  const a = sum(thisM);
  const b = sum(last);
  if (b === 0) return { pct: a === 0 ? 0 : 100, up: a > b };
  return { pct: ((a - b) / b) * 100, up: a >= b };
}

export function compactMonth(d: Date) {
  return format(d, "MMMM yyyy");
}

export function clock(iso: string) {
  return format(parseISO(iso), "h:mm a").toLowerCase();
}
