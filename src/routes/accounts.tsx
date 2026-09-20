import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { GoldBtn, IconBtn, PageTitle, Sheet } from "@/components/ui";
import { liveEntries } from "@/lib/format";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";

export const Route = createFileRoute("/accounts")({ component: AccountsPage });

const COLORS = ["#4ADE80", "#A78BFA", "#60A5FA", "#F59E0B", "#F472B6", "#F87171"];

function AccountsPage() {
  const accounts = useLedger((s) => s.accounts);
  const entries = useLedger((s) => s.entries);
  const addAccount = useLedger((s) => s.addAccount);
  const updateAccount = useLedger((s) => s.updateAccount);
  const deleteAccount = useLedger((s) => s.deleteAccount);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]!);

  const startNew = () => {
    setEditing(null);
    setName("");
    setColor(COLORS[0]!);
    setOpen(true);
  };

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>Accounts</PageTitle>
        </div>
      </header>

      <p className="mb-3 text-sm text-muted">Payment methods like Cash, UPI, or a bank account.</p>

      <div className="space-y-2">
        {accounts.map((a) => (
          <article key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
            <span className="size-3 rounded-full" style={{ background: a.color }} />
            <p className="flex-1 font-semibold">{a.name}</p>
            <button
              type="button"
              aria-label={`Edit ${a.name}`}
              className="p-2 text-gold"
              onClick={() => {
                setEditing(a);
                setName(a.name);
                setColor(a.color);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${a.name}`}
              className="p-2 text-pay"
              onClick={() => {
                if (accounts.length <= 1) return toast.error("Keep at least one account");
                if (liveEntries(entries).some((e) => e.accountId === a.id)) {
                  return toast.error("This account has entries — delete those first");
                }
                deleteAccount(a.id);
                toast.success("Account removed");
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
        <Plus className="size-5" /> Add account
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? "Edit account" : "New account"}>
        <label className="text-xs text-muted">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. UPI"
          className="mt-1 mb-3 h-11 w-full rounded-xl border border-border bg-surface-2 px-3 outline-none"
        />
        <p className="text-xs text-muted">Color</p>
        <div className="mt-1 mb-4 flex gap-2">
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
              updateAccount(editing.id, { name: name.trim(), color });
              toast.success("Account updated");
            } else {
              addAccount({ name: name.trim(), color });
              toast.success("Account added");
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
