import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, LogIn, Sparkles, User } from "lucide-react";
import { GoldBtn } from "@/components/ui";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const settings = useLedger((s) => s.settings);
  const patchSettings = useLedger((s) => s.patchSettings);
  const [name, setName] = useState(settings.displayName || "");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"welcome" | "name" | "pin" | "confirm">(
    settings.pin ? "welcome" : "name",
  );
  const [error, setError] = useState("");

  const finish = () => {
    if (pin.length !== 4 || pin !== confirm) {
      setError("PINs do not match");
      setConfirm("");
      return;
    }
    patchSettings({
      displayName: name.trim() || settings.displayName || "Friend",
      pin,
      biometric: true,
    });
    sessionStorage.setItem("khata-unlocked", "1");
    void navigate({ to: "/" });
  };

  const unlockExisting = () => {
    if (pin === settings.pin) {
      sessionStorage.setItem("khata-unlocked", "1");
      void navigate({ to: "/" });
    } else {
      setError("Wrong PIN");
      setPin("");
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#06080e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(228,184,74,0.14),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(52,211,153,0.08),transparent_40%)]" />

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-10 pt-16">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-3xl bg-gold/15 text-gold shadow-[0_0_40px_rgba(228,184,74,0.2)]">
            <Sparkles className="size-10" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-gold">SHIVA</h1>
          <p className="mt-2 max-w-xs text-sm text-zinc-400">
            PIN se secure · Voice + AI balances
          </p>
        </div>

        <div className="mt-12 flex-1">
          {step === "welcome" && settings.pin ? (
            <div className="mx-auto max-w-sm space-y-4">
              <p className="text-center text-sm text-zinc-300">
                Welcome back{settings.displayName ? `, ${settings.displayName}` : ""}
              </p>
              <label className="block text-xs text-zinc-500">4-digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-gold/50"
                placeholder="••••"
              />
              {error ? <p className="text-center text-xs text-pay">{error}</p> : null}
              <GoldBtn className="w-full" onClick={unlockExisting}>
                <span className="inline-flex items-center gap-2">
                  <LogIn className="size-4" /> Unlock
                </span>
              </GoldBtn>
              <button
                type="button"
                className="w-full text-center text-xs text-zinc-500 underline"
                onClick={() => {
                  setStep("name");
                  setPin("");
                  setConfirm("");
                }}
              >
                Set up a new PIN
              </button>
            </div>
          ) : null}

          {step === "name" ? (
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <User className="size-4 text-gold" /> Your name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Prince"
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-gold/50"
              />
              <GoldBtn className="w-full" onClick={() => setStep("pin")}>
                Continue
              </GoldBtn>
            </div>
          ) : null}

          {step === "pin" ? (
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Lock className="size-4 text-gold" /> Create 4-digit PIN
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-gold/50"
                placeholder="••••"
              />
              <GoldBtn
                className="w-full"
                disabled={pin.length !== 4}
                onClick={() => pin.length === 4 && setStep("confirm")}
              >
                Next
              </GoldBtn>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Lock className="size-4 text-gold" /> Confirm PIN
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-gold/50"
                placeholder="••••"
              />
              {error ? <p className="text-center text-xs text-pay">{error}</p> : null}
              <GoldBtn className="w-full" disabled={confirm.length !== 4} onClick={finish}>
                Save &amp; Enter App
              </GoldBtn>
              <button
                type="button"
                className="w-full text-center text-xs text-zinc-500"
                onClick={() => {
                  setStep("pin");
                  setConfirm("");
                }}
              >
                Back
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-center text-[11px] text-zinc-600">
          PIN stays on this device. You can change it anytime in Settings.
        </p>
      </div>
    </div>
  );
}
