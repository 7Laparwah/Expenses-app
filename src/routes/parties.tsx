import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, FileSpreadsheet, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { GoldBtn, IconBtn, PageTitle, Sheet } from "@/components/ui";
import { PartyGlyph, ICON_KEYS } from "@/lib/icons";
import { liveEntries } from "@/lib/format";
import { downloadPartyStatement, downloadPartyStatementExcel, downloadPartyStatementPdf } from "@/lib/export";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Party } from "@/lib/types";

export const Route = createFileRoute("/parties")({ component: PartiesPage });

const COLORS = ["#F59E0B", "#60A5FA", "#34D399", "#A78BFA", "#FB7185", "#F97316", "#2DD4BF", "#FACC15"];

function PartiesPage() {
  const parties = useLedger((s) => s.parties);
  const entries = useLedger((s) => s.entries);
  const accounts = useLedger((s) => s.accounts);
  const addParty = useLedger((s) => s.addParty);
  const updateParty = useLedger((s) => s.updateParty);
  const deleteParty = useLedger((s) => s.deleteParty);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("user");
  const [color, setColor] = useState(COLORS[0]!);
  const [kind, setKind] = useState<Party["kind"]>("person");

  const startNew = () => {
    setEditing(null);
    setName("");
    setIcon("user");
    setColor(COLORS[0]!);
    setKind("person");
    setOpen(true);
  };

  const startEdit = (p: Party) => {
    setEditing(p);
    setName(p.name);
    setIcon(p.icon);
    setColor(p.color);
    setKind(p.kind);
    setOpen(true);
  };

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>Parties</PageTitle>
        </div>
      </header>

      <p className="mb-3 text-sm text-muted">People, categories, and savings pots used on entries.</p>

      <div className="space-y-2">
        {parties.map((p) => (
          <article key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
            <span
              className="grid size-11 place-items-center rounded-xl"
              style={{ background: `${p.color}22`, color: p.color }}
            >
              <PartyGlyph icon={p.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs capitalize text-muted">{p.kind}</p>
            </div>
            <button
              type="button"
              aria-label={`Statement PDF ${p.name}`}
              title="Wallet statement PDF"
              className="p-2 text-save"
              onClick={() => {
                try {
                  downloadPartyStatementPdf(p.name, p.id, entries, accounts);
                  toast.success("PDF downloaded");
                } catch (e) {
                  console.error(e);
                  downloadPartyStatement(p, entries, accounts);
                  toast.success("Opened print view (PDF lib fallback)");
                }
              }}
            >
              <FileText className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Statement Excel ${p.name}`}
              title="Wallet statement Excel"
              className="p-2 text-gold"
              onClick={() => {
                downloadPartyStatementExcel(p, entries, accounts);
                toast.success("Excel statement downloaded");
              }}
            >
              <FileSpreadsheet className="size-4" />
            </button>
            <button type="button" aria-label={`Edit ${p.name}`} onClick={() => startEdit(p)} className="p-2 text-gold">
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${p.name}`}
              className="p-2 text-pay"
              onClick={() => {
                const used = liveEntries(entries).some((e) => e.partyId === p.id);
                if (used) return toast.error("This party has entries — delete those first");
                deleteParty(p.id);
                toast.success("Party removed");
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={startNew}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 font-semibold text-gold-fg"
      >
        <Plus className="size-5" /> Add party
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? "Edit party" : "New party"}>
        <label className="text-xs text-muted">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ritik"
          className="mt-1 mb-3 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        />
        <p className="text-xs text-muted">Type</p>
        <div className="mt-1 mb-3 flex gap-2">
          {(["person", "category", "savings"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-semibold capitalize",
                kind === k ? "bg-gold text-gold-fg" : "bg-surface-2 text-muted",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Icon</p>
        <div className="mt-1 mb-3 grid grid-cols-7 gap-1.5">
          {ICON_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              onClick={() => setIcon(k)}
              className={cn(
                "grid size-10 place-items-center rounded-xl",
                icon === k ? "bg-gold text-gold-fg" : "bg-surface-2 text-muted",
              )}
            >
              <PartyGlyph icon={k} className="size-4" />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">Color</p>
        <div className="mt-1 mb-4 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn("size-8 rounded-full", color === c && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
              style={{ background: c }}
            />
          ))}
        </div>
        <GoldBtn
          className="w-full"
          onClick={() => {
            if (!name.trim()) return toast.error("Name required");
            if (editing) {
              updateParty(editing.id, { name: name.trim(), icon, color, kind });
              toast.success("Party updated");
            } else {
              addParty({ name: name.trim(), icon, color, kind });
              toast.success("Party added");
            }
            setOpen(false);
          }}
        >
          Save
        </GoldBtn>
      </Sheet>
    </Screen>
  );
}
