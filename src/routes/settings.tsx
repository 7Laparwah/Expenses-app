import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  IndianRupee,
  Lock,
  Moon,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell";
import { GoldBtn, IconBtn, Overlay, PageTitle, Toggle } from "@/components/ui";
import { inr } from "@/lib/format";
import { useLedger } from "@/lib/store";
import type { ReactNode } from "react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const settings = useLedger((s) => s.settings);
  const patchSettings = useLedger((s) => s.patchSettings);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [budget, setBudget] = useState(String(settings.monthlyBudget));
  const [pin, setPin] = useState("");

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <IconBtn label="Back" onClick={() => history.back()}>
          <ChevronLeft className="size-5" />
        </IconBtn>
        <div className="flex-1 text-center pr-11">
          <PageTitle>Settings</PageTitle>
        </div>
      </header>

      <div className="space-y-2">
        <Row
          icon={<IndianRupee className="size-5 text-gold" />}
          label="Monthly Budget Limit"
          trailing={<span className="font-semibold text-gold">{inr(settings.monthlyBudget)}</span>}
          onClick={() => setBudgetOpen(true)}
        />
        <Row
          icon={<Bell className="size-5 text-save" />}
          label="Notifications"
          trailing={
            <Toggle
              checked={settings.notifications}
              onChange={(v) => patchSettings({ notifications: v })}
              label="Notifications"
            />
          }
        />
        <Row
          icon={<Moon className="size-5 text-save" />}
          label="Dark / Light Mode"
          trailing={<span className="text-sm capitalize text-muted">{settings.theme}</span>}
          onClick={() => setThemeOpen(true)}
        />
        <Row
          icon={<Sparkles className="size-5 text-gold" />}
          label="AI Voice Parsing (Free)"
          trailing={<span className="text-sm text-muted">{settings.voiceParsing ? "On" : "Off"}</span>}
          onClick={() => {
            patchSettings({ voiceParsing: !settings.voiceParsing });
            void navigate({ to: "/voice" });
          }}
        />
        <Row
          icon={<Fingerprint className="size-5 text-save" />}
          label="Fingerprint / Biometric Lock"
          trailing={
            <span className={`text-sm font-semibold ${settings.biometric ? "text-recv" : "text-muted"}`}>
              {settings.biometric ? "ON" : "OFF"}
            </span>
          }
          onClick={() => {
            const next = !settings.biometric;
            patchSettings({ biometric: next });
            if (next && !settings.pin) setPinOpen(true);
          }}
        />
        <Row
          icon={<Lock className="size-5 text-gold" />}
          label="Reset App PIN"
          onClick={() => setPinOpen(true)}
        />
        <Row
          icon={<RotateCcw className="size-5 text-pay" />}
          label="Deleted Entry History"
          onClick={() => void navigate({ to: "/deleted" })}
        />
      </div>

      <Overlay open={themeOpen} onClose={() => setThemeOpen(false)} labelledBy="theme-title">
        <h2 id="theme-title" className="font-display text-xl text-gold">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-muted">Switch the whole ledger between dark and light.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              patchSettings({ theme: "dark" });
              setThemeOpen(false);
            }}
            className={`rounded-2xl border p-3 text-left ${settings.theme === "dark" ? "border-gold" : "border-border"}`}
          >
            <span className="block h-16 rounded-xl bg-[#07080c] ring-1 ring-white/10" />
            <span className="mt-2 block text-sm font-semibold">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              patchSettings({ theme: "light" });
              setThemeOpen(false);
            }}
            className={`rounded-2xl border p-3 text-left ${settings.theme === "light" ? "border-gold" : "border-border"}`}
          >
            <span className="block h-16 rounded-xl bg-[#f4efe4] ring-1 ring-black/10" />
            <span className="mt-2 block text-sm font-semibold">Light</span>
          </button>
        </div>
      </Overlay>

      <Overlay open={budgetOpen} onClose={() => setBudgetOpen(false)} labelledBy="budget-title">
        <h2 id="budget-title" className="font-display text-xl text-gold">
          Monthly budget
        </h2>
        <input
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 outline-none"
        />
        <GoldBtn
          className="mt-4 w-full"
          onClick={() => {
            patchSettings({ monthlyBudget: Number(budget) || 0 });
            setBudgetOpen(false);
            toast.success("Budget updated");
          }}
        >
          Save
        </GoldBtn>
      </Overlay>

      <Overlay open={pinOpen} onClose={() => setPinOpen(false)} labelledBy="pin-title">
        <h2 id="pin-title" className="font-display text-xl text-gold">
          Set 4-digit PIN
        </h2>
        <p className="mt-1 text-sm text-muted">Used as a lock on this device. Browser fingerprint is not available.</p>
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-center text-lg tracking-[0.4em] outline-none"
        />
        <GoldBtn
          className="mt-4 w-full"
          onClick={() => {
            if (pin.length !== 4) return toast.error("Enter 4 digits");
            patchSettings({ pin, biometric: true });
            sessionStorage.setItem("khata-unlocked", "1");
            setPinOpen(false);
            setPin("");
            toast.success("PIN saved");
          }}
        >
          Save PIN
        </GoldBtn>
      </Overlay>
    </Screen>
  );
}

function Row({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3.5 text-left"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-chip">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {trailing ?? <ChevronRight className="size-4 text-muted" />}
    </button>
  );
}
