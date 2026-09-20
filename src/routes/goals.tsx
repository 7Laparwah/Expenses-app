import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { MoreVertical, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { GoldBtn, PageTitle, Segmented, Sheet } from "@/components/ui";
import { CornerFab, Screen } from "@/components/shell";
import { PartyGlyph, ICON_KEYS } from "@/lib/icons";
import { inr, totals } from "@/lib/format";
import { deriveGoalStatuses, shouldPromptNewGoal } from "@/lib/ledger-engine";
import { goalSpent, useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/goals")({ component: GoalsPage });

function GoalsPage() {
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const goals = useLedger((s) => s.goals);
  const settings = useLedger((s) => s.settings);
  const addGoal = useLedger((s) => s.addGoal);
  const completeGoal = useLedger((s) => s.completeGoal);
  const deleteGoal = useLedger((s) => s.deleteGoal);
  const hide = settings.hideBalances;
  const [tab, setTab] = useState<"active" | "history">("active");
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("500");
  const [partyId, setPartyId] = useState(parties[0]?.id ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [menu, setMenu] = useState<string | null>(null);

  const derived = deriveGoalStatuses(goals, entries);
  const active = derived.filter((g) => g.derivedStatus === "active");
  const history = derived.filter((g) => g.derivedStatus === "completed" || g.derivedStatus === "ended");
  const list = tab === "active" ? active : history;
  const showNewGoalPrompt = shouldPromptNewGoal(goals, entries);
  const balance = totals(entries).balance;
  const pct = Math.min(100, Math.round((balance / Math.max(settings.savingsTarget, 1)) * 100));
  const ring = useMemo(() => {
    const r = 28;
    const c = 2 * Math.PI * r;
    return { c, dash: (pct / 100) * c };
  }, [pct]);

  return (
    <Screen>
      <PageTitle>Goals</PageTitle>

      {showNewGoalPrompt ? (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          Pichle goals close ho chuke hain — is naye mahine ke liye naya goal banayein!
        </div>
      ) : null}

      <section className="mt-4 flex items-center justify-between rounded-3xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm text-muted">Total Balance</p>
          <p className="font-display text-3xl font-semibold text-gold tabular-nums">
            {inr(balance, { hide })}
          </p>
          <p className="text-xs text-muted">of {inr(settings.savingsTarget, { hide })} target</p>
        </div>
        <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
          <circle cx="36" cy="36" r="28" fill="none" stroke="currentColor" className="text-surface-2" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${ring.dash} ${ring.c}`}
          />
          <text
            x="36"
            y="36"
            className="rotate-90 fill-fg text-[10px] font-semibold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform="rotate(90 36 36)"
          >
            {pct}%
          </text>
        </svg>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-save">Active Goals</p>
          <p className="text-2xl font-semibold">{active.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-recv">Completed</p>
          <p className="text-2xl font-semibold">{history.length}</p>
        </div>
      </div>

      <div className="mt-4">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as "active" | "history")}
          options={[
            { id: "active", label: `Active Goals (${active.length})` },
            { id: "history", label: `Goal History (${history.length})` },
          ]}
        />
      </div>

      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {tab === "active" ? "No active goals. Add one." : "No completed goals yet."}
          </p>
        ) : (
          list.map((g) => {
            const spent = "saved" in g ? (g as { saved: number }).saved : goalSpent(g, entries);
            const p = "pct" in g ? (g as { pct: number }).pct : Math.min(100, Math.round((spent / g.targetAmount) * 100));
            const statusLabel = "derivedStatus" in g ? (g as { derivedStatus: string }).derivedStatus : g.status;
            return (
              <article key={g.id} className="rounded-3xl border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-12 place-items-center rounded-full"
                    style={{ background: `${g.color}22`, color: g.color }}
                  >
                    <PartyGlyph icon={g.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{g.name}</h3>
                      <span className="rounded-full bg-save/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-save">
                        {statusLabel}
                      </span>
                      <span className="ml-auto text-sm font-semibold tabular-nums text-gold">{p}%</span>
                      <button type="button" aria-label="Goal menu" onClick={() => setMenu(g.id)}>
                        <MoreVertical className="size-4 text-muted" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {inr(spent, { hide })} / {inr(g.targetAmount, { hide })} · Target:{" "}
                      {format(parseISO(g.targetDate), "d MMM yyyy")}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.max(4, p)}%`, background: g.color }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <CornerFab
        label="Add goal"
        onClick={() => setForm(true)}
        className="size-14"
      >
        <Plus className="size-7" />
      </CornerFab>

      <Sheet open={form} onClose={() => setForm(false)} title="New goal">
        <label className="text-xs text-muted">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 mb-3 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        />
        <label className="text-xs text-muted">Target amount</label>
        <input
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mt-1 mb-3 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        />
        <label className="text-xs text-muted">Linked party</label>
        <select
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
          className="mt-1 mb-3 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        >
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="text-xs text-muted">Target date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 mb-4 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        />
        <GoldBtn
          className="w-full"
          onClick={() => {
            if (!name.trim()) return toast.error("Name required");
            const p = parties.find((x) => x.id === partyId);
            addGoal({
              name: name.trim(),
              icon: p?.icon ?? ICON_KEYS[0] ?? "target",
              color: p?.color ?? "#E4B84A",
              partyId,
              targetAmount: Number(target) || 0,
              targetDate: new Date(date).toISOString(),
            });
            setName("");
            setForm(false);
            toast.success("Goal added");
          }}
        >
          Save goal
        </GoldBtn>
      </Sheet>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title="Goal">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left"
          onClick={() => {
            if (menu) completeGoal(menu);
            setMenu(null);
            toast.success("Marked complete");
          }}
        >
          <Target className="size-4 text-recv" /> Mark complete
        </button>
        <button
          type="button"
          className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-3 text-left text-pay")}
          onClick={() => {
            if (menu) deleteGoal(menu);
            setMenu(null);
          }}
        >
          Delete
        </button>
      </Sheet>
    </Screen>
  );
}
