import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronLeft, CreditCard, StickyNote, Trash2, User, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { FieldCard, GoldBtn, IconBtn, PageTitle, Segmented, Sheet } from "@/components/ui";
import { inferType, useLedger } from "@/lib/store";
import { PartyGlyph, ICON_KEYS } from "@/lib/icons";
import { resizeImage, uid } from "@/lib/utils";
import type { EntryType } from "@/lib/types";

type Search = { edit?: string };

export const Route = createFileRoute("/add")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  component: AddPage,
});

function AddPage() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const accounts = useLedger((s) => s.accounts);
  const addEntry = useLedger((s) => s.addEntry);
  const updateEntry = useLedger((s) => s.updateEntry);
  const deleteEntry = useLedger((s) => s.deleteEntry);
  const addParty = useLedger((s) => s.addParty);

  const existing = entries.find((e) => e.id === edit && !e.deletedAt);

  const [kind, setKind] = useState<"payment" | "receive">(
    existing?.type === "receive" ? "receive" : "payment",
  );
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [partyId, setPartyId] = useState(existing?.partyId ?? "");
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? "cash");
  const [date, setDate] = useState(
    existing ? existing.date.slice(0, 16) : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [photo, setPhoto] = useState(existing?.photo);
  const [partyOpen, setPartyOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [newParty, setNewParty] = useState("");

  const party = parties.find((p) => p.id === partyId);
  const account = accounts.find((a) => a.id === accountId);
  const num = Number(amount) || 0;

  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(date.length === 16 ? `${date}:00` : date), "dd/MM/yyyy");
    } catch {
      return date;
    }
  }, [date]);

  const save = () => {
    if (!partyId) {
      toast.error("Select a party");
      setPartyOpen(true);
      return;
    }
    if (num <= 0) {
      toast.error("Enter an amount");
      return;
    }
    const type: EntryType = inferType(party, kind);
    const payload = {
      type,
      amount: num,
      partyId,
      accountId,
      date: new Date(date).toISOString(),
      notes,
      photo,
    };
    if (existing) {
      updateEntry(existing.id, payload);
      toast.success("Entry updated");
    } else {
      addEntry(payload);
      toast.success("Entry saved");
    }
    void navigate({ to: "/entries" });
  };

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>{existing ? "Edit Entry" : "Add Entry"}</PageTitle>
        </div>
      </header>

      <Segmented
        value={kind}
        onChange={(v) => setKind(v as "payment" | "receive")}
        options={[
          { id: "payment", label: "Payment" },
          { id: "receive", label: "Receive" },
        ]}
      />

      <p className="mt-8 text-center font-display text-5xl font-semibold tabular-nums tracking-tight">
        ₹{num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder="0.00"
        className="mt-5 w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-muted outline-none"
      />

      <div className="mt-3 space-y-2">
        <FieldCard
          icon={<User className="size-5" />}
          label="Party Name *"
          value={party?.name}
          placeholder="Select Party"
          onClick={() => setPartyOpen(true)}
        />
        <label className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
          <span className="grid size-11 place-items-center rounded-xl bg-chip text-gold">
            <CalendarDays className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">Date (Today)</span>
            <span className="block text-[15px] font-semibold">{dateLabel}</span>
          </span>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
          />
        </label>
        <FieldCard
          icon={<CreditCard className="size-5" />}
          label="Payment Method"
          value={account?.name ?? "Cash"}
          onClick={() => setMethodOpen(true)}
        />
        <label className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
          <span className="grid size-11 place-items-center rounded-xl bg-chip text-gold">
            <StickyNote className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">Notes (Optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes here..."
              className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-faint"
            />
          </span>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-gold">
          <Camera className="size-5" />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setPhoto(await resizeImage(file));
                toast.success("Photo attached");
              } catch {
                toast.error("Could not attach photo");
              }
            }}
          />
        </label>
        <GoldBtn className="flex-1" onClick={save}>
          {existing ? "Update Entry" : "Save Entry"}
        </GoldBtn>
      </div>
      {photo ? <img src={photo} alt="Receipt" className="mt-3 h-24 rounded-2xl object-cover" /> : null}

      {existing ? (
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 py-3 text-sm text-pay"
          onClick={() => {
            deleteEntry(existing.id);
            toast.success("Moved to deleted history");
            void navigate({ to: "/entries" });
          }}
        >
          <Trash2 className="size-4" /> Delete entry
        </button>
      ) : null}

      <Sheet open={partyOpen} onClose={() => setPartyOpen(false)} title="Select Party">
        <div className="mb-3 flex gap-2">
          <input
            value={newParty}
            onChange={(e) => setNewParty(e.target.value)}
            placeholder="New party name"
            className="h-11 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none"
          />
          <GoldBtn
            className="px-4 py-0"
            onClick={() => {
              if (!newParty.trim()) return;
              const id = addParty({
                name: newParty.trim(),
                icon: ICON_KEYS[Math.floor(Math.random() * ICON_KEYS.length)] ?? "user",
                color: "#E4B84A",
                kind: "person",
              });
              setPartyId(id);
              setNewParty("");
              setPartyOpen(false);
            }}
          >
            Add
          </GoldBtn>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {parties.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
              onClick={() => {
                setPartyId(p.id);
                setPartyOpen(false);
              }}
            >
              <span
                className="grid size-10 place-items-center rounded-xl"
                style={{ background: `${p.color}22`, color: p.color }}
              >
                <PartyGlyph icon={p.icon} className="size-4" />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={methodOpen} onClose={() => setMethodOpen(false)} title="Payment Method">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface-2"
            onClick={() => {
              setAccountId(a.id);
              setMethodOpen(false);
            }}
          >
            <span className="size-3 rounded-full" style={{ background: a.color }} />
            {a.name}
          </button>
        ))}
      </Sheet>
    </Screen>
  );
}
