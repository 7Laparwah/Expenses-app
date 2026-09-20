export { downloadPartyStatementPdf, exportToPDF } from "./wallet-pdf";
import { format, parseISO } from "date-fns";
import { downloadBlob } from "./utils";
import { clock, inr, liveEntries, partyName, withRunningBalance } from "./format";
import type { Account, Entry, Party } from "./types";

export function entriesToCsv(
  entries: Entry[],
  parties: Party[],
  accounts: Account[],
) {
  const rows = [["Date", "Time", "Type", "Party", "Amount", "Method", "Notes", "Balance"]];
  const ordered = withRunningBalance(entries).slice().reverse();
  for (const e of ordered) {
    rows.push([
      format(parseISO(e.date), "yyyy-MM-dd"),
      clock(e.date),
      e.type,
      partyName(parties, e.partyId),
      String(e.type === "receive" ? e.amount : -e.amount),
      accounts.find((a) => a.id === e.accountId)?.name ?? "",
      e.notes.replaceAll(",", " "),
      String(e.balance),
    ]);
  }
  return `\uFEFF${rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")}`;
}

export function downloadExcel(
  entries: Entry[],
  parties: Party[],
  accounts: Account[],
) {
  downloadBlob(
    `khata-report-${format(new Date(), "yyyy-MM-dd")}.csv`,
    "text/csv;charset=utf-8",
    entriesToCsv(entries, parties, accounts),
  );
}

/** Generic all-entries PDF (legacy). */
export function downloadPdf(
  entries: Entry[],
  parties: Party[],
  accounts: Account[],
) {
  openPrintHtml(buildAllEntriesHtml(entries, parties, accounts));
  downloadBlob(
    `khata-report-${format(new Date(), "yyyy-MM-dd")}.html`,
    "text/html;charset=utf-8",
    buildAllEntriesHtml(entries, parties, accounts),
  );
}

/**
 * Party Wallet Statement — same structure as the official PDF:
 * WALLET STATEMENT · Party · table (No, Date, Party Name, Debit, Credit, Method, Note)
 * + TOTAL / NET BALANCE + Generated on
 * Cream page, lotus watermark, temple badge (top-right).
 */
export function downloadPartyStatement(
  party: Party,
  entries: Entry[],
  accounts: Account[],
) {
  const partyEntries = liveEntries(entries)
    .filter((e) => e.partyId === party.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const html = buildPartyStatementHtml(party, partyEntries, accounts);
  const safeName = party.name.replace(/[^\w\s-]/g, "").trim() || "party";
  openPrintHtml(html);
  downloadBlob(
    `WalletStatement_${safeName}_${Date.now()}.html`,
    "text/html;charset=utf-8",
    html,
  );
}

function openPrintHtml(html: string) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function methodName(accounts: Account[], accountId: string) {
  return accounts.find((a) => a.id === accountId)?.name ?? "Cash";
}

function buildPartyStatementHtml(party: Party, partyEntries: Entry[], accounts: Account[]) {
  let totalDebit = 0;
  let totalCredit = 0;

  const bodyRows = partyEntries
    .map((e, i) => {
      const isCredit = e.type === "receive";
      if (isCredit) totalCredit += e.amount;
      else totalDebit += e.amount;
      const debit = isCredit ? "" : String(e.amount);
      const credit = isCredit ? String(e.amount) : "";
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${format(parseISO(e.date), "dd/MM/yyyy")}</td>
        <td>${escapeHtml(party.name)}</td>
        <td class="num">${debit}</td>
        <td class="num">${credit}</td>
        <td>${escapeHtml(methodName(accounts, e.accountId))}</td>
        <td class="note">${escapeHtml(e.notes || "")}</td>
      </tr>`;
    })
    .join("");

  const net = totalCredit - totalDebit;
  const netLabel =
    net === 0 ? "Rs. 0" : net > 0 ? `+ Rs. ${net}` : `- Rs. ${Math.abs(net)}`;

  const generated = format(new Date(), "dd/MM/yyyy");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Wallet Statement — ${escapeHtml(party.name)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
    background: #f7f1e6;
  }
  .page {
    position: relative;
    min-height: 100vh;
    padding: 28px 32px 40px;
    background:
      radial-gradient(circle at 50% 42%, rgba(212,175,110,0.07) 0%, transparent 55%),
      #f7f1e6;
    overflow: hidden;
  }
  /* Lotus watermark */
  .watermark {
    position: absolute;
    left: 50%;
    top: 48%;
    transform: translate(-50%, -50%);
    width: min(78%, 420px);
    opacity: 0.14;
    pointer-events: none;
    z-index: 0;
  }
  .content { position: relative; z-index: 1; }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .lotus-corner {
    width: 36px;
    height: 36px;
    opacity: 0.55;
  }
  .temple {
    width: 92px;
    height: 72px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    padding: 4px;
    object-fit: contain;
  }
  h1 {
    margin: 12px 0 4px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1e293b;
  }
  .party-line {
    margin: 0 0 18px;
    font-size: 14px;
    color: #334155;
  }
  .party-line strong { color: #0f172a; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    background: rgba(255,255,255,0.55);
    border-radius: 8px;
    overflow: hidden;
  }
  thead th {
    background: #1e4d8c;
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 10px 8px;
    font-size: 11px;
  }
  thead th.c { text-align: center; width: 36px; }
  tbody td {
    padding: 8px;
    border-bottom: 1px solid #e8dfd0;
    vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: rgba(255,252,247,0.7); }
  td.c { text-align: center; color: #64748b; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.note { color: #475569; max-width: 180px; }
  .totals {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px 28px;
    align-items: baseline;
    font-size: 13px;
    font-weight: 600;
  }
  .totals span.label { color: #64748b; font-weight: 600; margin-right: 6px; }
  .totals .net { margin-left: auto; color: #0f172a; }
  .footer {
    margin-top: 28px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
  }
  @media print {
    body { background: #f7f1e6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { min-height: auto; }
  }
</style>
</head>
<body>
  <div class="page">
    <!-- SVG lotus watermark -->
    <svg class="watermark" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="#c4a574" stroke-width="1.2">
        <circle cx="100" cy="100" r="12"/>
        <path d="M100 40 C110 70 110 70 100 100 C90 70 90 70 100 40Z"/>
        <path d="M100 160 C110 130 110 130 100 100 C90 130 90 130 100 160Z"/>
        <path d="M40 100 C70 90 70 90 100 100 C70 110 70 110 40 100Z"/>
        <path d="M160 100 C130 90 130 90 100 100 C130 110 130 110 160 100Z"/>
        <path d="M58 58 C80 80 80 80 100 100 C80 80 80 80 58 58Z"/>
        <path d="M142 142 C120 120 120 120 100 100 C120 120 120 120 142 142Z"/>
        <path d="M142 58 C120 80 120 80 100 100 C120 80 120 80 142 58Z"/>
        <path d="M58 142 C80 120 80 120 100 100 C80 120 80 120 58 142Z"/>
        <path d="M100 28 C118 55 130 75 100 100 C70 75 82 55 100 28Z"/>
        <path d="M100 172 C118 145 130 125 100 100 C70 125 82 145 100 172Z"/>
        <path d="M28 100 C55 82 75 70 100 100 C75 130 55 118 28 100Z"/>
        <path d="M172 100 C145 82 125 70 100 100 C125 130 145 118 172 100Z"/>
      </g>
    </svg>

    <div class="content">
      <div class="topbar">
        <svg class="lotus-corner" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g fill="none" stroke="#c4a574" stroke-width="1.4">
            <path d="M20 6 C24 14 24 14 20 22 C16 14 16 14 20 6Z"/>
            <path d="M8 18 C16 16 16 16 22 20 C16 22 16 22 8 18Z"/>
            <path d="M32 18 C24 16 24 16 18 20 C24 22 24 22 32 18Z"/>
            <path d="M12 30 C18 24 18 24 20 20 C18 24 18 24 12 30Z"/>
            <path d="M28 30 C22 24 22 24 20 20 C22 24 22 24 28 30Z"/>
          </g>
        </svg>
        <!-- Temple badge (inline SVG matching statement style) -->
        <svg class="temple" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Temple">
          <rect width="120" height="90" rx="8" fill="#e8f4fc"/>
          <circle cx="95" cy="22" r="14" fill="#ffe9a8"/>
          <rect x="20" y="48" width="80" height="28" fill="#c4a882"/>
          <rect x="35" y="38" width="50" height="12" fill="#b8956c"/>
          <!-- gopuram tiers -->
          <path d="M40 38 L60 12 L80 38 Z" fill="#c45c3a"/>
          <rect x="48" y="22" width="24" height="8" fill="#e8b86d"/>
          <rect x="52" y="14" width="16" height="8" fill="#d4a017"/>
          <rect x="55" y="8" width="10" height="6" fill="#c45c3a"/>
          <rect x="52" y="55" width="16" height="21" fill="#5c4033"/>
          <rect x="25" y="58" width="12" height="18" fill="#8b6914"/>
          <rect x="83" y="58" width="12" height="18" fill="#8b6914"/>
          <line x1="10" y1="76" x2="110" y2="76" stroke="#7a9e7e" stroke-width="4"/>
        </svg>
      </div>

      <h1>Wallet Statement</h1>
      <p class="party-line">Party : <strong>${escapeHtml(party.name)}</strong></p>

      <table>
        <thead>
          <tr>
            <th class="c">No.</th>
            <th>Date</th>
            <th>Party Name</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Method</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows || `<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8">No entries for this party</td></tr>`}
        </tbody>
      </table>

      <div class="totals">
        <div><span class="label">TOTAL</span> Debit ${totalDebit} &nbsp; Credit ${totalCredit}</div>
        <div class="net"><span class="label">NET BALANCE</span> ${netLabel}</div>
      </div>

      <p class="footer">Generated on ${generated}</p>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}

function buildAllEntriesHtml(
  entries: Entry[],
  parties: Party[],
  accounts: Account[],
) {
  const rows = withRunningBalance(entries)
    .slice()
    .reverse()
    .map((e) => {
      const sign = e.type === "receive" ? "+" : "-";
      return `<tr>
        <td>${format(parseISO(e.date), "dd MMM yyyy")} ${clock(e.date)}</td>
        <td>${e.type}</td>
        <td>${escapeHtml(partyName(parties, e.partyId))}</td>
        <td>${escapeHtml(accounts.find((a) => a.id === e.accountId)?.name ?? "")}</td>
        <td class="${e.type === "receive" ? "recv" : "pay"}">${sign} ${inr(e.amount)}</td>
        <td>${escapeHtml(e.notes)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Khata Report</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { color: #555; margin: 0 0 16px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #e5e5e5; text-align: left; padding: 8px 6px; }
      th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; }
      .pay { color: #c2410c; } .recv { color: #047857; }
    </style></head><body>
    <h1>Khata · Entry report</h1>
    <p>${liveEntries(entries).length} entries · generated ${format(new Date(), "dd MMM yyyy p")}</p>
    <table><thead><tr><th>When</th><th>Type</th><th>Party</th><th>Method</th><th>Amount</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
}


/**
 * Party statement for Excel — same columns as PDF wallet statement.
 * Excel does not support page watermarks; data layout matches the PDF.
 * Opens cleanly in Excel / Google Sheets (UTF-8 CSV).
 */
export function downloadPartyStatementExcel(
  party: Party,
  entries: Entry[],
  accounts: Account[],
) {
  const partyEntries = liveEntries(entries)
    .filter((e) => e.partyId === party.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let totalDebit = 0;
  let totalCredit = 0;
  const rows: string[][] = [
    ["WALLET STATEMENT"],
    [`Party : ${party.name}`],
    [],
    ["No.", "Date", "Party Name", "Debit", "Credit", "Method", "Note"],
  ];

  partyEntries.forEach((e, i) => {
    const isCredit = e.type === "receive";
    if (isCredit) totalCredit += e.amount;
    else totalDebit += e.amount;
    rows.push([
      String(i + 1),
      format(parseISO(e.date), "dd/MM/yyyy"),
      party.name,
      isCredit ? "" : String(e.amount),
      isCredit ? String(e.amount) : "",
      methodName(accounts, e.accountId),
      e.notes.replaceAll(",", " "),
    ]);
  });

  rows.push([]);
  rows.push(["TOTAL", "", "", String(totalDebit), String(totalCredit), "", ""]);
  const net = totalCredit - totalDebit;
  rows.push([
    "NET BALANCE",
    "",
    "",
    "",
    net === 0 ? "Rs. 0" : net > 0 ? `+ Rs. ${net}` : `- Rs. ${Math.abs(net)}`,
    "",
    "",
  ]);
  rows.push([]);
  rows.push([`Generated on ${format(new Date(), "dd/MM/yyyy")}`]);

  const csv = "\uFEFF" + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
");
  const safeName = party.name.replace(/[^\w\s-]/g, "").trim() || "party";
  downloadBlob(
    `WalletStatement_${safeName}_${Date.now()}.csv`,
    "text/csv;charset=utf-8",
    csv,
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
