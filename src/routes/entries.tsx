import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileSpreadsheet, FileText, Search, SlidersHorizontal, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Screen } from "@/components/shell";
import { EntryCard } from "@/components/entry-card";
import { GoldBtn, IconBtn, Overlay, PageTitle } from "@/components/ui";
import { groupByDay, partyName, withRunningBalance } from "@/lib/format";
import { downloadExcel, downloadPdf } from "@/lib/export";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/entries")({ component: EntriesPage });

type Filter = "all" | "payment" | "receive" | "transfer";

function EntriesPage() {
  const navigate = useNavigate();
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const accounts = useLedger((s) => s.accounts);
  const hide = useLedger((s) => s.settings.hideBalances);
  const [tab, setTab] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [searchOn, setSearchOn] = useState(false);
  const [day, setDay] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportType, setExportType] = useState<"all" | "payment" | "receive">("all");

  const filtered = useMemo(() => {
    let list = withRunningBalance(entries).slice().reverse();
    if (tab !== "all") list = list.filter((e) => e.type === tab);
    if (day) list = list.filter((e) => e.date.slice(0, 10) === day);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (e) =>
          partyName(parties, e.partyId).toLowerCase().includes(s) ||
          e.notes.toLowerCase().includes(s),
      );
    }
    return list;
  }, [entries, tab, q, day, parties]);

  const groups = groupByDay(filtered);

  const exportPool = useMemo(() => {
    if (exportType === "all") return entries;
    return entries.filter((e) => (exportType === "payment" ? e.type !== "receive" : e.type === "receive"));
  }, [entries, exportType]);

  return (
    <Screen>
      <header className="flex items-center justify-between gap-2">
        <PageTitle>Entries</PageTitle>
        <div className="flex gap-2">
          <IconBtn label="Search" onClick={() => setSearchOn((v) => !v)}>
            <Search className="size-4" />
          </IconBtn>
          <label className="grid size-11 place-items-center rounded-xl border border-border bg-surface-2">
            <CalendarDays className="size-4" />
            <input
              type="date"
              className="sr-only"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <IconBtn label="Filter and export" onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal className="size-4" />
          </IconBtn>
        </div>
      </header>

      {searchOn ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-surface px-3">
          <Search className="size-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search party or notes"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
          <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setSearchOn(false); }}>
            <X className="size-4 text-muted" />
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "payment", "receive", "transfer"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold capitalize",
              tab === id ? "bg-gold text-gold-fg" : "bg-surface-2 text-muted",
            )}
          >
            {id === "all" ? "All" : id[0]!.toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {day ? (
        <button type="button" className="mt-2 text-xs text-gold" onClick={() => setDay("")}>
          Clearing {format(parseISO(day), "d MMM yyyy")} filter
        </button>
      ) : null}

      <div className="mt-4 space-y-5">
        {groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No entries yet. Tap + to add one.</p>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-xs text-muted">{g.label}</h2>
              <div className="space-y-2">
                {g.items.map((e) => (
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
          ))
        )}
      </div>

      <Overlay open={filterOpen} onClose={() => setFilterOpen(false)} labelledBy="filter-title">
        <div className="flex items-start justify-between">
          <h2 id="filter-title" className="font-display text-xl text-gold">
            Filter & Export
          </h2>
          <button type="button" aria-label="Close" onClick={() => setFilterOpen(false)}>
            <X className="size-5 text-muted" />
          </button>
        </div>
        <p className="mt-4 text-sm font-medium">Type</p>
        <div className="mt-2 flex rounded-2xl bg-surface-2 p-1">
          {(["all", "payment", "receive"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setExportType(id)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize",
                exportType === id ? "bg-gold text-gold-fg" : "text-muted",
              )}
            >
              {id === "all" ? "All" : id[0]!.toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm font-medium">Download Report</p>
        <GoldBtn
          className="mt-2 flex w-full items-center justify-center gap-2"
          onClick={() => {
            downloadExcel(exportPool, parties, accounts);
            toast.success("Excel report downloaded");
          }}
        >
          <FileSpreadsheet className="size-4" /> Download Excel
        </GoldBtn>
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold"
          onClick={() => {
            downloadPdf(exportPool, parties, accounts);
            setFilterOpen(false);
          }}
        >
          <FileText className="size-4" /> Download PDF
        </button>
      </Overlay>
    </Screen>
  );
}
