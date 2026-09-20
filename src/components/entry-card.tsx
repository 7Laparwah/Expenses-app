import { Pencil } from "lucide-react";
import { PartyGlyph } from "@/lib/icons";
import { clock, inr, partyName } from "@/lib/format";
import type { Account, Entry, Party } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EntryCard({
  entry,
  parties,
  accounts,
  balance,
  hide,
  onEdit,
}: {
  entry: Entry;
  parties: Party[];
  accounts: Account[];
  balance?: number;
  hide?: boolean;
  onEdit?: () => void;
}) {
  const party = parties.find((p) => p.id === entry.partyId);
  const method = accounts.find((a) => a.id === entry.accountId)?.name ?? "";
  const receive = entry.type === "receive";
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
      <div
        className="grid size-12 shrink-0 place-items-center rounded-2xl"
        style={{ background: `${party?.color ?? "#888"}22`, color: party?.color }}
      >
        <PartyGlyph icon={party?.icon ?? "user"} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold text-fg">{partyName(parties, entry.partyId)}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("text-sm font-semibold tabular-nums", receive ? "text-recv" : "text-pay")}>
              {inr(receive ? entry.amount : -entry.amount, { hide, sign: true })}
            </span>
            {onEdit ? (
              <button type="button" aria-label="Edit entry" onClick={onEdit} className="text-gold">
                <Pencil className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-0.5 flex items-end justify-between gap-2 text-xs text-muted">
          <p className="min-w-0 truncate">
            {method}
            {entry.notes ? ` · ${entry.notes}` : ""}
            <span className="mt-0.5 block text-faint">{clock(entry.date)}</span>
          </p>
          {balance !== undefined ? (
            <span className={cn("shrink-0 tabular-nums", balance < 0 ? "text-pay" : "text-muted")}>
              Balance: {inr(balance, { hide, sign: true })}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
