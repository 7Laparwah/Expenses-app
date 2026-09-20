import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Screen } from "@/components/shell";
import { PageTitle, Segmented, Sheet } from "@/components/ui";
import { PartyGlyph } from "@/lib/icons";
import {
  compactMonth,
  inr,
  monthEntries,
  partyBreakdown,
  weeklyTrend,
} from "@/lib/format";
import { useLedger } from "@/lib/store";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const navigate = useNavigate();
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const hide = useLedger((s) => s.settings.hideBalances);
  const [month, setMonth] = useState(() => new Date());
  const [mode, setMode] = useState<"payment" | "receive">("payment");
  const [picker, setPicker] = useState(false);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.date.slice(0, 7));
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return [...set].sort().reverse().map((key) => {
      const [y, m] = key.split("-").map(Number);
      return new Date(y, m - 1, 1);
    });
  }, [entries]);

  const slice = monthEntries(entries, month);
  const type = mode === "payment" ? "outflow" : "receive";
  const { total, rows } = partyBreakdown(slice, parties, type);
  const weeks = weeklyTrend(entries, month, type);
  const top = rows.slice(0, 3);

  return (
    <Screen>
      <PageTitle>Analytics</PageTitle>

      <button
        type="button"
        onClick={() => setPicker(true)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
      >
        {compactMonth(month)}
        <ChevronDown className="size-4 text-muted" />
      </button>

      <div className="mt-3">
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "payment" | "receive")}
          options={[
            { id: "payment", label: "Payment" },
            { id: "receive", label: "Receive" },
          ]}
        />
      </div>

      <section className="mt-4 rounded-3xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-muted">
          {mode === "payment" ? "Payment" : "Receive"} Overview
        </h2>
        <p className="font-display text-2xl font-semibold tabular-nums">{inr(total, { hide })}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="amount"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  stroke="none"
                >
                  {rows.map((r) => (
                    <Cell key={r.partyId} fill={r.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-0 flex-1 space-y-1 text-xs">
            {rows.slice(0, 11).map((r) => (
              <li key={r.partyId} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: r.color }} />
                <span className="w-8 tabular-nums text-muted">{Math.round(r.pct)}%</span>
                <span className="truncate">{r.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">
          {mode === "payment" ? "Payment" : "Receive"} Trend
        </h2>
        <div className="mt-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks}>
              <XAxis dataKey="label" tick={{ fill: "currentColor", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  background: "var(--app-surface-2)",
                  border: "1px solid var(--app-border)",
                  borderRadius: 12,
                }}
                formatter={(v: number) => inr(v)}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {weeks.map((w, i) => (
                  <Cell key={w.label} fill={i === 0 ? "#60a5fa" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-gold" /> Top Parties
          </h2>
          <button
            type="button"
            onClick={() => void navigate({ to: "/parties" })}
            className="text-sm font-medium text-gold"
          >
            See All →
          </button>
        </div>
        <ul className="space-y-4">
          {top.map((r) => (
            <li key={r.partyId}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <PartyGlyph icon={r.icon} className="size-4" />
                  {r.name}
                </span>
                <span className="tabular-nums">{inr(r.amount, { hide })}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(6, r.pct)}%`, background: r.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Month">
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {months.map((m) => (
            <button
              key={m.toISOString()}
              type="button"
              className="w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-surface-2"
              onClick={() => {
                setMonth(m);
                setPicker(false);
              }}
            >
              {compactMonth(m)}
            </button>
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}
