import { useEffect, useState } from "react";
import { Delete, Fingerprint, Sparkles } from "lucide-react";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

const KEY = "khata-unlocked";

export function PinLock() {
  const pin = useLedger((s) => s.settings.pin);
  const name = useLedger((s) => s.settings.displayName);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Lock whenever a PIN is set (session not unlocked)
    if (!pin || pin.length !== 4) return;
    if (sessionStorage.getItem(KEY) === "1") return;
    setOpen(true);
  }, [pin]);

  if (!open) return null;

  const push = (d: string) => {
    if (value.length >= 4) return;
    const next = (value + d).slice(0, 4);
    setValue(next);
    setError(false);
    if (next.length === 4) {
      if (next === pin) {
        sessionStorage.setItem(KEY, "1");
        setOpen(false);
        setValue("");
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setValue("");
          setShake(false);
        }, 450);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#06080e]">
      {/* Cosmic glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(228,184,74,0.12),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(96,165,250,0.08),transparent_45%)]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8">
        <div className="mb-2 grid size-16 place-items-center rounded-2xl bg-gold/15 text-gold">
          <Sparkles className="size-8" />
        </div>
        <p className="font-display text-3xl font-semibold tracking-tight text-gold">SHIVA</p>
        <p className="mt-2 text-sm text-zinc-400">
          {name ? `Welcome back, ${name}` : "4-digit PIN se unlock karein"}
        </p>

        {/* PIN dots */}
        <div
          className={cn(
            "mt-10 flex justify-center gap-4 transition-transform",
            shake && "animate-[shake_0.4s_ease-in-out]",
          )}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-all duration-200",
                i < value.length
                  ? error
                    ? "border-pay bg-pay scale-110"
                    : "border-gold bg-gold scale-110 shadow-[0_0_12px_rgba(228,184,74,0.5)]"
                  : "border-white/20 bg-transparent",
              )}
            />
          ))}
        </div>
        {error ? (
          <p className="mt-3 text-xs font-medium text-pay">Wrong PIN — try again</p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">Secure unlock</p>
        )}

        {/* Keypad */}
        <div className="mt-10 grid w-full max-w-[280px] grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"].map((k) => {
            if (k === "bio") {
              return (
                <button
                  key="bio"
                  type="button"
                  aria-label="Biometric"
                  className="grid h-16 place-items-center rounded-2xl border border-white/8 bg-white/5 text-zinc-400"
                >
                  <Fingerprint className="size-6" />
                </button>
              );
            }
            if (k === "del") {
              return (
                <button
                  key="del"
                  type="button"
                  aria-label="Delete"
                  className="grid h-16 place-items-center rounded-2xl border border-white/8 bg-white/5 text-zinc-400 active:scale-95"
                  onClick={() => setValue((v) => v.slice(0, -1))}
                >
                  <Delete className="size-5" />
                </button>
              );
            }
            return (
              <button
                key={k}
                type="button"
                className="h-16 rounded-2xl border border-white/8 bg-white/5 text-xl font-semibold text-white transition active:scale-95 active:bg-gold/20"
                onClick={() => push(k)}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>

      <p className="relative z-10 pb-10 text-center text-[11px] text-zinc-600">
        Unlock ke baad hi data dikhega
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/** Call on logout to force PIN again next visit */
export function lockApp() {
  sessionStorage.removeItem(KEY);
}
