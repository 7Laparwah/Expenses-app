import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mic, Sparkles, X, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { askLedgerAi } from "@/lib/ai";
import { buildAiContext } from "@/lib/ai-context";
import { inferType, useLedger } from "@/lib/store";
import type { EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoldBtn } from "@/components/ui";

type Search = { listen?: boolean };

export const Route = createFileRoute("/voice")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    listen: s.listen === true || s.listen === "1" || s.listen === "true" ? true : undefined,
  }),
  component: VoicePage,
});

type Mode = "entry" | "ask";
type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface ParsedEntry {
  type: EntryType;
  amount: number;
  party: string;
  method: string;
  notes: string;
  date?: string;
}

function VoicePage() {
  const { listen } = Route.useSearch();
  const navigate = useNavigate();
  const snap = useLedger();
  const addEntry = useLedger((s) => s.addEntry);

  const [mode, setMode] = useState<Mode>("entry");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Idle — tap to speak");
  const [reply, setReply] = useState("");
  const [review, setReview] = useState<ParsedEntry | null>(null);

  const recRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const transcriptRef = useRef("");
  const alive = useRef(true);
  const busy = useRef(false);
  const autoStarted = useRef(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      hardStop();
    };
  }, []);

  const hardStop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    window.speechSynthesis?.cancel();
    setOrbState("idle");
    busy.current = false;
  }, []);

  const playChime = (up: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(up ? 520 : 380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(up ? 780 : 220, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      /* ignore */
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis || !text) {
      setOrbState("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1.02;
    u.pitch = 1.0;
    const voices = speechSynthesis.getVoices();
    const ind = voices.find((v) => /en-IN|hi-IN|Indian/i.test(v.lang + v.name));
    if (ind) u.voice = ind;
    u.onstart = () => setOrbState("speaking");
    u.onend = u.onerror = () => {
      if (alive.current) setOrbState("idle");
    };
    speechSynthesis.speak(u);
  };

  const start = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserRec;
      webkitSpeechRecognition?: new () => BrowserRec;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      setStatus("Voice not supported — type below");
      setOrbState("idle");
      return;
    }

    hardStop();
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      transcriptRef.current = text;
      setTranscript(text);

      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        if (alive.current && transcriptRef.current.trim()) {
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }
      }, 1300);
    };

    rec.onerror = () => {
      setOrbState("idle");
      setStatus("Could not hear that. Tap mic to try again.");
      playChime(false);
    };

    rec.onend = () => {
      if (!alive.current) return;
      setOrbState("idle");
      const t = transcriptRef.current.trim();
      if (t) void run(t);
      else setStatus("Idle — tap to speak");
    };

    recRef.current = rec;
    try {
      rec.start();
      setOrbState("listening");
      setReply("");
      setReview(null);
      setStatus("Listening… Speak now");
      playChime(true);
    } catch {
      setStatus("Idle — tap to speak");
      setOrbState("idle");
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    playChime(false);
    setOrbState("idle");
  };

  useEffect(() => {
    if (!listen || autoStarted.current) return;
    autoStarted.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen]);

  const run = async (text: string) => {
    const message = text.trim();
    if (!message) return toast.error("Say or type something first");
    if (busy.current) return;
    busy.current = true;
    setOrbState("thinking");
    setStatus("Thinking…");
    setReply("");

    try {
      const res = await askLedgerAi({
        data: {
          mode: mode === "entry" ? "parse" : "chat",
          message,
          context: buildAiContext(snap),
        },
      });

      if (!res.ok) {
        setStatus(res.error);
        setOrbState("idle");
        return;
      }

      if (mode === "ask") {
        setReply(res.text);
        setStatus("Answer ready");
        speak(res.text);
        return;
      }

      const parsed = parseEntry(res.text);
      if (!parsed || !parsed.amount) {
        setReply(res.text);
        setStatus("Could not parse amount. Edit below or try again.");
        setOrbState("idle");
        return;
      }

      const party =
        snap.parties.find((p) => p.name.toLowerCase() === parsed.party.toLowerCase()) ||
        snap.parties.find((p) => p.name.toLowerCase().includes(parsed.party.toLowerCase())) ||
        snap.parties.find((p) => parsed.party.toLowerCase().includes(p.name.toLowerCase()));

      const account =
        snap.accounts.find((a) => a.name.toLowerCase() === parsed.method.toLowerCase()) ||
        snap.accounts.find((a) => /upi|gpay|phonepe/i.test(a.name) && /upi/i.test(parsed.method)) ||
        snap.accounts[0];

      if (!party) {
        setReply(`Heard ₹${parsed.amount} for “${parsed.party}”. Add that party first.`);
        setStatus("Party not found");
        setOrbState("idle");
        return;
      }

      const final: ParsedEntry = {
        ...parsed,
        party: party.name,
        method: account?.name || parsed.method || "Cash",
      };

      setReview(final);
      setStatus("Review & confirm");
      setOrbState("idle");
    } catch {
      setStatus("AI unavailable. Try typing an entry instead.");
      setOrbState("idle");
    } finally {
      busy.current = false;
    }
  };

  const confirmEntry = () => {
    if (!review) return;
    const party = snap.parties.find((p) => p.name === review.party);
    const account =
      snap.accounts.find((a) => a.name.toLowerCase() === review.method.toLowerCase()) ||
      snap.accounts[0];
    if (!party || !account) {
      toast.error("Party or account missing");
      return;
    }
    addEntry({
      type: inferType(party, review.type),
      amount: review.amount,
      partyId: party.id,
      accountId: account.id,
      date: review.date || new Date().toISOString(),
      notes: review.notes || transcript,
    });
    toast.success(`Saved ${review.type} ₹${review.amount} · ${party.name}`);
    setReview(null);
    void navigate({ to: "/entries" });
  };

  const statusDotClass =
    orbState === "listening"
      ? "bg-recv shadow-[0_0_10px_#3ddc84] animate-pulse"
      : orbState === "thinking"
        ? "bg-purple-400 shadow-[0_0_10px_#a78bfa] animate-pulse"
        : orbState === "speaking"
          ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"
          : "bg-zinc-500";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#06080e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(80,180,80,0.16),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.08),transparent_50%)]" />

      <header className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            hardStop();
            history.back();
          }}
          className="grid size-10 place-items-center rounded-full bg-white/10"
        >
          <X className="size-4" />
        </button>

        <div className="text-center">
          <Sparkles className="mx-auto size-5 text-save" />
          <p className="mt-1 text-[10px] tracking-[0.35em] text-zinc-400">SHIVA · AI VOICE</p>
        </div>

        <div className="w-10" />
      </header>

      <div className="relative z-10 px-6">
        <div className="mx-auto flex max-w-sm rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("entry")}
            className={cn(
              "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
              mode === "entry"
                ? "bg-gradient-to-r from-emerald-800 to-emerald-700 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                : "text-zinc-400",
            )}
          >
            + Quick Entry
          </button>
          <button
            type="button"
            onClick={() => setMode("ask")}
            className={cn(
              "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
              mode === "ask"
                ? "bg-gradient-to-r from-violet-800 to-cyan-800 text-indigo-100 shadow-[0_0_18px_rgba(167,139,250,0.4)]"
                : "text-zinc-400",
            )}
          >
            ✦ Ask Balance
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div className="relative grid size-56 place-items-center">
          <div
            className={cn(
              "orb-glow absolute size-64 rounded-full blur-2xl transition-colors duration-500",
              orbState === "listening" && "bg-recv/30",
              orbState === "thinking" && "bg-purple-500/30",
              orbState === "speaking" && "bg-cyan-400/30",
              orbState === "idle" && "bg-recv/20",
            )}
          />
          <div
            className={cn(
              "orb relative size-48 transition-all duration-300",
              orbState === "listening" && "scale-105",
              orbState === "thinking" && "scale-110",
              orbState === "speaking" && "scale-110",
            )}
          />
          <svg className="pointer-events-none absolute size-52 text-white/20" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.4" />
            <path d="M20 50 H80 M50 20 V80" stroke="currentColor" strokeWidth="0.3" />
          </svg>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm">
          <span className={cn("size-2 rounded-full", statusDotClass)} />
          <span className="text-zinc-300">{status}</span>
        </div>

        <p className="mt-3 min-h-8 max-w-[90%] px-6 text-center text-sm text-zinc-300">
          {transcript}
        </p>

        {reply ? (
          <p className="mx-6 mt-2 max-w-md rounded-2xl border border-white/10 bg-white/10 p-3 text-sm leading-relaxed">
            {reply}
          </p>
        ) : null}
      </div>

      {review ? (
        <div className="relative z-20 mx-4 mb-4 rounded-2xl border border-white/10 bg-slate-900/90 p-4 backdrop-blur-xl">
          <p className="text-sm text-zinc-200">
            ₹{review.amount} · <span className="font-semibold text-white">{review.party}</span> ·{" "}
            {review.method}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {review.date || "Today"} · {review.type}
            {review.notes ? ` · ${review.notes}` : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmEntry}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-emerald-50"
            >
              <Check className="size-4" /> Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setReview(null);
                setStatus("Edit or re-speak");
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold"
            >
              <Pencil className="size-4" /> Edit
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 px-6 pb-8">
        <div className="relative mx-auto mb-5 grid size-24 place-items-center">
          {orbState === "listening" ? (
            <>
              <span className="listen-ring absolute inset-0 rounded-full border border-recv" />
              <span className="listen-ring absolute inset-0 rounded-full border border-gold [animation-delay:400ms]" />
            </>
          ) : null}
          <button
            type="button"
            aria-label={orbState === "listening" ? "Stop listening" : "Start listening"}
            onClick={() => (orbState === "listening" ? stop() : start())}
            className={cn(
              "relative z-10 grid size-20 place-items-center rounded-full border-2 border-gold bg-black transition-all",
              orbState === "listening" && "bg-gold text-gold-fg shadow-[0_0_28px_rgba(228,184,74,0.45)]",
            )}
          >
            <Mic className="size-7" />
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(transcript);
          }}
        >
          <input
            value={transcript}
            onChange={(e) => {
              transcriptRef.current = e.target.value;
              setTranscript(e.target.value);
            }}
            placeholder="Or type: paid 40 cash auto"
            className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-zinc-500"
          />
          <GoldBtn className="px-5 py-0" onClick={() => void run(transcript)}>
            Go
          </GoldBtn>
        </form>
      </div>
    </div>
  );
}

interface BrowserRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function parseEntry(text: string): ParsedEntry | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as {
      type?: string;
      amount?: number;
      party?: string;
      method?: string;
      notes?: string;
      date?: string;
    };
    const type: EntryType =
      raw.type === "receive" || raw.type === "transfer" ? raw.type : "payment";
    return {
      type,
      amount: Number(raw.amount) || 0,
      party: String(raw.party || ""),
      method: String(raw.method || "Cash"),
      notes: String(raw.notes || ""),
      date: raw.date,
    };
  } catch {
    return null;
  }
}
