import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Menu,
  MessageCircle,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { CornerFab, Screen } from "@/components/shell";
import { EntryCard } from "@/components/entry-card";
import { Overlay } from "@/components/ui";
import { PartyGlyph } from "@/lib/icons";
import {
  compactMonth,
  greeting,
  inr,
  methodSplit,
  monthEntries,
  totals,
  vsLastMonth,
  withRunningBalance,
} from "@/lib/format";
import { budgetStatus, totalSavings, walletBalances } from "@/lib/ledger-engine";
import { goalSpent, useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: WalletHome });

function WalletHome() {
  const navigate = useNavigate();
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const accounts = useLedger((s) => s.accounts);
  const goals = useLedger((s) => s.goals);
  const settings = useLedger((s) => s.settings);
  const patchSettings = useLedger((s) => s.patchSettings);
  const hide = settings.hideBalances;
  const [goalIdx, setGoalIdx] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);

  const all = totals(entries);
  const month = totals(monthEntries(entries, new Date()));
  const split = methodSplit(monthEntries(entries, new Date()), accounts);
  const recent = withRunningBalance(entries).slice().reverse().slice(0, 4);
  const activeGoals = goals.filter((g) => g.status === "active");
  const goal = activeGoals[goalIdx % Math.max(activeGoals.length, 1)];
  const vs = vsLastMonth(entries, "receive");
  const budget = budgetStatus(entries, settings);
  const overBudget = budget.level !== "ok";
  const savingsAmt = totalSavings(entries, parties);
  const wallets = walletBalances(entries, accounts);

  const gradient = useMemo(() => {
    if (!split.length) return "transparent";
    let acc = 0;
    const stops = split.map((s) => {
      const from = acc;
      acc += s.pct;
      return `${s.color} ${from}% ${acc}%`;
    });
    return `linear-gradient(90deg, ${stops.join(",")})`;
  }, [split]);

  return (
    <Screen className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          aria-label="Open profile"
          onClick={() => void navigate({ to: "/profile" })}
          className="mt-1 text-fg"
        >
          <Menu className="size-6" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="mx-auto max-w-[16.5rem] text-[1.35rem] font-semibold leading-tight tracking-tight text-fg">
            {greeting()}
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted">
            <CalendarDays className="size-3.5" />
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setNotesOpen(true)}
          className="relative mt-1 text-fg"
        >
          <Bell className="size-6" />
          {overBudget ? (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-pay" />
          ) : null}
        </button>
      </header>

      <section className="relative min-h-[292px] overflow-hidden rounded-3xl border border-border">
        <img
          src="/images/dunes.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_70%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/92 via-bg/35 to-transparent" />
        <div className="relative flex min-h-[292px] flex-col px-4 pb-3 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-hero-muted">Total Balance</p>
              <p className="mt-1 font-display text-[2rem] font-semibold tabular-nums leading-none text-hero">
                {inr(all.balance, { hide })}
              </p>
              <p className={cn("mt-2 text-xs", vs.up ? "text-recv" : "text-pay")}>
                Receive {vs.pct >= 0 ? "+" : ""}
                {vs.pct.toFixed(1)}% vs last month
              </p>
            </div>
            <button
              type="button"
              aria-label={hide ? "Show balances" : "Hide balances"}
              onClick={() => patchSettings({ hideBalances: !hide })}
              className="grid size-9 place-items-center rounded-full bg-black/25 text-hero"
            >
              {hide ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-2 pt-16">
            <Stat
              icon={<ArrowDownLeft className="size-4" />}
              tone="text-recv bg-recv/20"
              label="Receive"
              value={inr(all.receive, { hide })}
            />
            <Stat
              icon={<ArrowUpRight className="size-4" />}
              tone="text-pay bg-pay/20"
              label="Payment"
              value={inr(all.outflow, { hide })}
            />
            <Stat
              icon={<PiggyBank className="size-4" />}
              tone="text-save bg-save/20"
              label="Savings"
              value={inr(all.savings, { hide })}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Payment Method</h2>
          <button
            type="button"
            onClick={() => void navigate({ to: "/add" })}
            className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted"
          >
            <LayoutGrid className="size-3.5" /> Pay Now
          </button>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: gradient }} />
        <ul className="mt-3 space-y-2">
          {split.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
              <span className="tabular-nums text-fg">
                {inr(s.amount, { hide })}{" "}
                <span className="text-muted">{s.pct.toFixed(1)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {goal ? (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface">
          {goal.icon === "pill" ? (
            <img src="/images/pills.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-80" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-surface to-surface-2" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/40 to-transparent" />
          <div className="relative flex items-center gap-2 px-2 py-4">
            <button
              type="button"
              aria-label="Previous goal"
              className="p-2 text-muted"
              onClick={() => setGoalIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => void navigate({ to: "/goals" })}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <PartyGlyph icon={goal.icon} className="size-4 text-gold" />
                Goal · {goal.name}
              </div>
              <p className="mt-1 text-sm tabular-nums">
                {inr(goalSpent(goal, entries), { hide })} / {inr(goal.targetAmount, { hide })}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{
                    width: `${Math.min(100, (goalSpent(goal, entries) / goal.targetAmount) * 100)}%`,
                  }}
                />
              </div>
            </button>
            <button
              type="button"
              aria-label="Next goal"
              className="p-2 text-muted"
              onClick={() => setGoalIdx((i) => i + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="relative flex justify-center gap-1 pb-3">
            {activeGoals.map((g, i) => (
              <span
                key={g.id}
                className={cn("size-1.5 rounded-full", i === goalIdx % activeGoals.length ? "bg-gold" : "bg-white/30")}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-gold" /> Recent Transactions
          </h2>
          <button
            type="button"
            onClick={() => void navigate({ to: "/entries" })}
            className="text-sm font-medium text-gold"
          >
            See All →
          </button>
        </div>
        <div className="space-y-2">
          {recent.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              parties={parties}
              accounts={accounts}
              balance={e.balance}
              hide={hide}
              onEdit={() => void navigate({ to: "/add", search: { edit: e.id } })}
            />
          ))}
        </div>
      </section>

      <CornerFab label="Ask AI" onClick={() => void navigate({ to: "/ai" })}>
        <MessageCircle className="size-5" />
      </CornerFab>

      <Overlay open={notesOpen} onClose={() => setNotesOpen(false)} labelledBy="notes-title">
        <h2 id="notes-title" className="font-display text-xl text-gold">
          Notifications
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          {budget.level === "critical" ? (
            <li className="rounded-2xl bg-pay/10 px-3 py-3 text-pay">
              Critical: Monthly spend {inr(budget.used)} is at {budget.pct.toFixed(0)}% of {inr(budget.limit)} budget.
            </li>
          ) : budget.level === "warning" ? (
            <li className="rounded-2xl bg-amber-500/10 px-3 py-3 text-amber-400">
              Warning: Monthly spend {inr(budget.used)} is at {budget.pct.toFixed(0)}% of {inr(budget.limit)} budget (≥80%).
            </li>
          ) : (
            <li className="rounded-2xl bg-surface-2 px-3 py-3 text-muted">
              Spending is within the {compactMonth(new Date())} budget ({budget.pct.toFixed(0)}% used).
            </li>
          )}
          <li className="rounded-2xl bg-surface-2 px-3 py-3 text-muted">
            Hold the gold plus button to open Shiva voice entry.
          </li>
        </ul>
      </Overlay>
    </Screen>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className={cn("mx-auto mb-1 grid size-8 place-items-center rounded-full", tone)}>{icon}</div>
      <p className="text-[11px] text-hero-muted">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-hero">{value}</p>
    </div>
  );
}
