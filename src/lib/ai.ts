import { createServerFn } from "@tanstack/react-start";

type AiMode = "chat" | "parse";

export const askLedgerAi = createServerFn({ method: "POST" })
  .validator((input: { mode: AiMode; message: string; context: string }) => {
    const message = (input?.message ?? "").toString().slice(0, 800);
    const context = (input?.context ?? "").toString().slice(0, 2500);
    const mode: AiMode = input?.mode === "parse" ? "parse" : "chat";
    return { mode, message, context };
  })
  .handler(async ({ data }) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const xaiKey = process.env.XAI_API_KEY;

    const system =
      data.mode === "parse"
        ? `You extract a single expense-tracker entry from a voice/text note (often Hinglish/Indian English).
Return ONLY compact valid JSON (no markdown, no extra text) with keys:
type: "payment" | "receive" | "transfer",
amount: number (INR, no commas or symbols),
party: string (short name of person/shop),
method: "Cash" | "UPI" | "Bank",
notes: string (optional extra info),
date: "YYYY-MM-DD" (optional, convert "kal"/"yesterday"/"parso" to real date; today is ${new Date().toISOString().slice(0, 10)}).
If amount missing use 0. Do not invent large amounts. Prefer real party names from context when possible.`
        : `You are Shiva, a concise personal finance assistant for an INR ledger.
Use ONLY the provided context. Answer in short natural sentences. Use ₹ and Indian number grouping.
Cite exact numbers from context. Never invent transactions or balances.
If user asks in Hindi/Hinglish, reply in simple Hinglish. No filler phrases like "I understand".

UDHAAR RULES (must follow):
- "Kisse paise lene hain" / who owes me / receivables → use ONLY the line "Receivables (kisse lena)" from context. List each person with exact ₹ amount.
- "Kisko paise dene hain" / whom I owe / payables → use ONLY "Payables (kisko dena)". List each with exact ₹ amount.
- If list is "none", say clearly that nothing is pending.
- Do not mix routine categories (food, petrol, etc.) into udhaar answers.
- For total balance / wallets, use Net Balance and Wallets lines exactly.`;

    const userContent = `Context:\n${data.context}\n\n${data.mode === "parse" ? "Utterance" : "Question"}:\n${data.message}`;

    // Prefer Google Gemini when key is present
    if (geminiKey) {
      try {
        const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: {
              temperature: data.mode === "parse" ? 0 : 0.25,
              maxOutputTokens: data.mode === "parse" ? 240 : 400,
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return {
            ok: false as const,
            error: `Gemini failed (${res.status}). ${errText.slice(0, 120)}`,
          };
        }
        const body = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text =
          body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ??
          "";
        if (!text) return { ok: false as const, error: "Empty Gemini response." };
        return { ok: true as const, text };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Gemini request error",
        };
      }
    }

    // Fallback: xAI Grok
    if (!xaiKey) {
      return {
        ok: false as const,
        error: "AI key missing. Set GEMINI_API_KEY (or XAI_API_KEY) in .env",
      };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: data.mode === "parse" ? 0 : 0.25,
        max_tokens: data.mode === "parse" ? 240 : 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: `AI request failed (${res.status}).` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty AI response." };
    return { ok: true as const, text };
  });
