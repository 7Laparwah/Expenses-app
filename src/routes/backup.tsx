import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { GoldBtn, IconBtn, PageTitle } from "@/components/ui";
import { downloadBlob } from "@/lib/utils";
import { useLedger } from "@/lib/store";
import type { LedgerSnapshot } from "@/lib/types";
import { format } from "date-fns";

export const Route = createFileRoute("/backup")({ component: BackupPage });

function isSnapshot(x: unknown): x is LedgerSnapshot {
  if (!x || typeof x !== "object") return false;
  const o = x as LedgerSnapshot;
  return (
    Array.isArray(o.parties) &&
    Array.isArray(o.accounts) &&
    Array.isArray(o.entries) &&
    Array.isArray(o.goals) &&
    !!o.settings &&
    typeof o.settings === "object"
  );
}

function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const parties = useLedger((s) => s.parties);
  const accounts = useLedger((s) => s.accounts);
  const entries = useLedger((s) => s.entries);
  const goals = useLedger((s) => s.goals);
  const settings = useLedger((s) => s.settings);
  const importSnapshot = useLedger((s) => s.importSnapshot);

  const exportJson = () => {
    const snap: LedgerSnapshot = { parties, accounts, entries, goals, settings };
    downloadBlob(
      `khata-backup-${format(new Date(), "yyyy-MM-dd")}.json`,
      "application/json",
      JSON.stringify(snap, null, 2),
    );
    toast.success("Backup downloaded");
  };

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>Backup</PageTitle>
        </div>
      </header>

      <p className="text-sm text-muted">
        Data lives on this device. Download a JSON backup before switching phones, or restore one you saved earlier.
      </p>

      <div className="mt-6 space-y-2">
        <GoldBtn className="flex w-full items-center justify-center gap-2" onClick={exportJson}>
          <Download className="size-4" /> Download backup
        </GoldBtn>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 font-semibold"
        >
          <Upload className="size-4" /> Restore from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const raw = JSON.parse(await file.text()) as unknown;
              if (!isSnapshot(raw)) throw new Error("Invalid backup");
              importSnapshot(raw);
              toast.success("Ledger restored");
            } catch {
              toast.error("That file is not a Khata backup");
            }
          }}
        />
      </div>

      <p className="mt-6 text-xs text-muted">
        {parties.length} parties · {accounts.length} accounts · {entries.length} entries · {goals.length} goals
      </p>
    </Screen>
  );
}
