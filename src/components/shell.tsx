import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  List,
  PieChart,
  Plus,
  Target,
  Wallet,
} from "lucide-react";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppFrame({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const hydrated = useLedger((s) => s.hydrated);
  const setHydrated = useLedger((s) => s.setHydrated);
  const theme = useLedger((s) => s.settings.theme);

  useEffect(() => {
    setMounted(true);
    if (useLedger.persist.hasHydrated()) setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  if (!mounted || !hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-gold">
        <p className="font-display text-2xl">Khata</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink">
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-bg text-fg">
        {children}
      </div>
    </div>
  );
}

const TABS = [
  { to: "/", id: "wallet", label: "Wallet", Icon: Wallet },
  { to: "/analytics", id: "analytics", label: "Analytics", Icon: PieChart },
  { to: "/entries", id: "entries", label: "Entries", Icon: List },
  { to: "/goals", id: "goals", label: "Goals", Icon: Target },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hide = path === "/voice" || path === "/ai";
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);
  const longPress = useRef(false);
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);

  if (hide) return null;

  const clearTimers = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (hintTimer.current) {
      window.clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
  };

  const startHold = (e: PointerEvent<HTMLButtonElement>) => {
    longPress.current = false;
    setHolding(true);
    setHint(false);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    hintTimer.current = window.setTimeout(() => setHint(true), 160);
    timer.current = window.setTimeout(() => {
      longPress.current = true;
      setHolding(false);
      setHint(false);
      try {
        navigator.vibrate?.(35);
      } catch {
        /* ignore */
      }
      void navigate({ to: "/voice", search: { listen: true } });
    }, 380);
  };

  const endHold = () => {
    const wasLong = longPress.current;
    clearTimers();
    setHolding(false);
    setHint(false);
    if (!wasLong) void navigate({ to: "/add" });
  };

  const cancelHold = () => {
    clearTimers();
    setHolding(false);
    setHint(false);
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-3 pb-3">
      <div className="pointer-events-auto relative flex items-center justify-between rounded-[28px] border border-white/5 bg-nav px-2 py-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {TABS.slice(0, 2).map((t) => (
          <NavItem key={t.id} {...t} active={path === t.to} />
        ))}
        <div className="w-16" />
        {TABS.slice(2).map((t) => (
          <NavItem key={t.id} {...t} active={path === t.to} />
        ))}
        <button
          type="button"
          aria-label="Add entry. Hold for voice"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "no-callout absolute left-1/2 top-0 grid size-16 -translate-x-1/2 -translate-y-5 place-items-center rounded-full bg-gold text-gold-fg shadow-[0_0_24px_rgba(228,184,74,0.55)]",
            "transition-transform duration-150",
            holding && "scale-110",
          )}
        >
          <Plus className="size-8" strokeWidth={2.5} />
          {hint ? (
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-9 whitespace-nowrap rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold text-gold-fg">
              Voice
            </span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: typeof Wallet;
  active: boolean;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => void navigate({ to })}
      className={cn(
        "flex w-[4.5rem] flex-col items-center gap-0.5 py-1 text-[11px] font-medium",
        active ? "text-gold" : "text-zinc-400",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

export function Screen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("min-h-dvh px-4 pb-28 pt-4", className)}>{children}</main>
  );
}

export function CornerFab({
  children,
  onClick,
  label,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto flex w-full max-w-[430px] justify-end px-4">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          "pointer-events-auto grid size-12 place-items-center rounded-full bg-gold text-gold-fg shadow-lg",
          className,
        )}
      >
        {children}
      </button>
    </div>
  );
}
