import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, Mic, Send, Sparkles, Target, Users, Wallet, X, Volume2 } from "lucide-react";
import { askLedgerAi } from "@/lib/ai";
import { buildAiContext } from "@/lib/ai-context";
import { useLedger } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai")({ component: AiPage });

type Msg = { role: "user" | "ai"; text: string };

const CHIPS = [
  { label: "Total Balance?", prompt: "What is my total balance?", Icon: Wallet },
  { label: "Kisse lena hai?", prompt: "Kisse paise lene hain? List names and exact amounts.", Icon: Users },
  { label: "Kisko dena hai?", prompt: "Kisko paise dene hain? List names and exact amounts.", Icon: Users },
  { label: "This Month Spending", prompt: "How much did I spend this month?", Icon: BarChart3 },
  { label: "Savings Goals", prompt: "How are my savings goals doing?", Icon: Target },
];

function AiPage() {
  const navigate = useNavigate();
  const snap = useLedger();
  const name = snap.settings.displayName || "there";
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const speak = (text: string) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1.02;
    const voices = speechSynthesis.getVoices();
    const ind = voices.find((v) => /en-IN|hi-IN|Indian/i.test(v.lang + v.name));
    if (ind) u.voice = ind;
    speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await askLedgerAi({
        data: { mode: "chat", message, context: buildAiContext(snap) },
      });
      const reply = res.ok ? res.text : res.error;
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Could not reach the assistant." }]);
    } finally {
      setBusy(false);
      queueMicrotask(() => bottom.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#06080e] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="grid size-10 place-items-center rounded-xl bg-save/20 text-save">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">AI Assistant</p>
          <p className="text-xs text-zinc-400">Ask Balance & Financial Insights</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => history.back()}
          className="grid size-10 place-items-center rounded-full bg-white/10"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {msgs.length === 0 ? (
          <div className="flex min-h-[65dvh] flex-col items-center justify-center text-center">
            <Sparkles className="size-10 text-save" />
            <h1 className="mt-6 text-2xl font-semibold leading-tight">
              What&apos;s on your mind, {name.toUpperCase()}?
            </h1>
            <p className="mt-2 max-w-xs text-sm text-zinc-400">
              Ask me anything about your balance, expenses, party dues, or financial targets.
            </p>
            <div className="mt-6 flex max-w-sm flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => void send(c.prompt)}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200"
                >
                  <c.Icon className="size-3.5 text-gold" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-gradient-to-br from-violet-700 to-cyan-800 text-indigo-50"
                    : "border border-white/10 bg-white/5",
                )}
              >
                {m.text}
                {m.role === "ai" ? (
                  <button
                    type="button"
                    onClick={() => speak(m.text)}
                    className="mt-2 flex items-center gap-1 text-[11px] text-violet-300"
                  >
                    <Volume2 className="size-3.5" /> Replay
                  </button>
                ) : null}
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 w-fit">
                <span className="size-1.5 animate-bounce rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 [animation-delay:300ms]" />
              </div>
            ) : null}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-white/10 px-3 pb-5 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <button
          type="button"
          aria-label="Voice"
          onClick={() => void navigate({ to: "/voice", search: { listen: true } })}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"
        >
          <Mic className="size-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your balance, expenses…"
          className="h-12 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-zinc-500"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-gold text-gold-fg"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
