import { useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Database,
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  User,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { IconBtn, Overlay, PageTitle } from "@/components/ui";
import { lockApp } from "@/components/pin-lock";
import { useLedger } from "@/lib/store";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const navigate = useNavigate();
  const settings = useLedger((s) => s.settings);
  const patchSettings = useLedger((s) => s.patchSettings);
  const resetAll = useLedger((s) => s.resetAll);
  const light = settings.theme === "light";
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <PageTitle>Profile</PageTitle>
        <div className="flex gap-2">
          <IconBtn
            label="Toggle theme"
            onClick={() => patchSettings({ theme: light ? "dark" : "light" })}
          >
            {light ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconBtn>
          <IconBtn label="Settings" onClick={() => void navigate({ to: "/settings" })}>
            <Settings className="size-4" />
          </IconBtn>
        </div>
      </header>

      <div className="mt-8 flex flex-col items-center">
        <div className="grid size-24 place-items-center rounded-full bg-gold text-gold-fg">
          <User className="size-10" />
        </div>
        <input
          value={settings.displayName}
          onChange={(e) => patchSettings({ displayName: e.target.value })}
          placeholder="Tap to set your name"
          className="mt-4 w-full bg-transparent text-center text-lg font-semibold outline-none placeholder:text-faint"
        />
        <p className="text-xs text-muted">Saved on this device</p>
      </div>

      <div className="mt-8 space-y-2">
        <Row icon={<Settings className="size-5 text-gold" />} label="Settings" onClick={() => void navigate({ to: "/settings" })} />
        <Row icon={<WalletCards className="size-5 text-recv" />} label="Manage Accounts" onClick={() => void navigate({ to: "/accounts" })} />
        <Row icon={<Users className="size-5 text-gold" />} label="Manage / Add Party" onClick={() => void navigate({ to: "/parties" })} />
        <Row icon={<MessageCircle className="size-5 text-save" />} label="Ask Balance (AI Chat)" onClick={() => void navigate({ to: "/ai" })} />
        <Row icon={<Database className="size-5 text-save" />} label="Backup & Restore" onClick={() => void navigate({ to: "/backup" })} />
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 font-semibold text-pay"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>

      <Overlay open={logoutOpen} onClose={() => setLogoutOpen(false)} labelledBy="logout-title">
        <h2 id="logout-title" className="font-display text-xl text-gold">
          Log out
        </h2>
        <p className="mt-2 text-sm text-muted">
          Lock app (PIN required again) or fully reset demo data on this device.
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="w-full rounded-2xl bg-gold py-3 font-semibold text-gold-fg"
            onClick={() => {
              lockApp();
              setLogoutOpen(false);
              toast.success("Locked — enter PIN to unlock");
              void navigate({ to: "/login" });
            }}
          >
            Lock &amp; ask PIN
          </button>
          <button
            type="button"
            className="w-full rounded-2xl bg-pay py-3 font-semibold text-white"
            onClick={() => {
              resetAll();
              lockApp();
              setLogoutOpen(false);
              toast.success("Ledger reset");
              void navigate({ to: "/login" });
            }}
          >
            Reset demo data
          </button>
          <button type="button" className="w-full rounded-2xl bg-surface-2 py-3" onClick={() => setLogoutOpen(false)}>
            Cancel
          </button>
        </div>
      </Overlay>
    </Screen>
  );
}

function Row({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3.5 text-left"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-chip">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted" />
    </button>
  );
}
