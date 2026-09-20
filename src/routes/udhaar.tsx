import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Users } from "lucide-react";
import { PageTitle } from "@/components/ui";
import { Screen } from "@/components/shell";
import { PartyGlyph } from "@/lib/icons";
import { inr } from "@/lib/format";
import { payables, receivables } from "@/lib/ledger-engine";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/udhaar")({ component: UdhaarPage });

function UdhaarPage() {
  const navigate = useNavigate();
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const hide = useLedger((s) => s.settings.hideBalances);

  const recv = receivables(entries, parties);
  const pay = payables(entries, parties);
  const totalRecv = recv.reduce((s, r) => s + r.balance, 0);
  const totalPay = pay.reduce((s, r) => s + Math.abs(r.balance), 0);

  return (
    <Screen className="space-y-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => history.back()}
          className="grid size-10 place-items-center rounded-xl bg-surface-2"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <PageTitle>Udhaar</PageTitle>
          <p className="text-xs text-muted">Receivables &amp; Payables</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-save/15 text-save">
          <Users className="size-5" />
        </span>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-recv/25 bg-recv/10 p-4">
          <div className="flex items-center gap-2 text-recv">
            <ArrowDownLeft className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Lena hai</span>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-recv">
            {inr(totalRecv, { hide })}
          </p>
          <p className="mt-1 text-[11px] text-muted">{recv.length} people</p>
        </div>
        <div className="rounded-2xl border border-pay/25 bg-pay/10 p-4">
          <div className="flex items-center gap-2 text-pay">
            <ArrowUpRight className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Dena hai</span>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-pay">
            {inr(totalPay, { hide })}
          </p>
          <p className="mt-1 text-[11px] text-muted">{pay.length} people</p>
        </div>
      </div>

      {/* Receivables */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-recv">
          <ArrowDownLeft className="size-4" />
          Kisse paise lene hain
        </h2>
        {recv.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            Koi receivable nahi — sab clear ✓
          </p>
        ) : (
          <ul className="space-y-2">
            {recv.map((r) => (
              <li
                key={r.partyId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3"
              >
                <span
                  className="grid size-11 place-items-center rounded-full"
                  style={{ background: `${r.color}22`, color: r.color }}
                >
                  <PartyGlyph icon={r.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted">Receivable</p>
                </div>
                <p className="font-semibold tabular-nums text-recv">{inr(r.balance, { hide })}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payables */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-pay">
          <ArrowUpRight className="size-4" />
          Kisko paise dene hain
        </h2>
        {pay.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
            Koi payable nahi — sab clear ✓
          </p>
        ) : (
          <ul className="space-y-2">
            {pay.map((r) => (
              <li
                key={r.partyId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3"
              >
                <span
                  className="grid size-11 place-items-center rounded-full"
                  style={{ background: `${r.color}22`, color: r.color }}
                >
                  <PartyGlyph icon={r.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted">Payable</p>
                </div>
                <p className={cn("font-semibold tabular-nums text-pay")}>
                  {inr(Math.abs(r.balance), { hide })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pb-6 text-center text-[11px] text-muted">
        Sirf real contacts (person) dikhte hain — food/petrol jaise categories udhaar me nahi aate.
      </p>
    </Screen>
  );
}
