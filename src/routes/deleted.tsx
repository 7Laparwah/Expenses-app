import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { IconBtn, PageTitle } from "@/components/ui";
import { EntryCard } from "@/components/entry-card";
import { useLedger } from "@/lib/store";

export const Route = createFileRoute("/deleted")({ component: DeletedPage });

function DeletedPage() {
  const entries = useLedger((s) => s.entries);
  const parties = useLedger((s) => s.parties);
  const accounts = useLedger((s) => s.accounts);
  const restoreEntry = useLedger((s) => s.restoreEntry);
  const purgeEntry = useLedger((s) => s.purgeEntry);
  const hide = useLedger((s) => s.settings.hideBalances);
  const deleted = entries.filter((e) => e.deletedAt).slice().reverse();

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>Deleted</PageTitle>
        </div>
      </header>

      {deleted.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No deleted entries.</p>
      ) : (
        <div className="space-y-3">
          {deleted.map((e) => (
            <div key={e.id} className="space-y-2">
              <EntryCard entry={e} parties={parties} accounts={accounts} hide={hide} />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2 text-sm font-medium text-recv"
                  onClick={() => {
                    restoreEntry(e.id);
                    toast.success("Entry restored");
                  }}
                >
                  <RotateCcw className="size-3.5" /> Restore
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-pay/10 py-2 text-sm font-medium text-pay"
                  onClick={() => {
                    purgeEntry(e.id);
                    toast.success("Permanently deleted");
                  }}
                >
                  <Trash2 className="size-3.5" /> Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
