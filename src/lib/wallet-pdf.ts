/**
 * Wallet Statement PDF — jsPDF 2.5.x + jspdf-autotable
 * Full-bleed A4 background (lotus + temple), navy header table, totals strip.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { PDF_BG_IMAGE } from "./pdf-bg-image";
import type { Account, Entry } from "./types";
import { liveEntries } from "./format";

function inrPlain(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

function methodName(accounts: Account[], accountId: string) {
  return accounts.find((a) => a.id === accountId)?.name ?? "Cash";
}

export type WalletPdfRow = {
  date: string; // ISO or display
  partyName: string;
  debit: number | null;
  credit: number | null;
  method: string;
  note: string;
};

/**
 * Core exporter — matches product PDF layout.
 * @param entriesList rows already mapped to debit/credit
 * @param partyName display name for "Party : …"
 */
export function exportToPDF(entriesList: WalletPdfRow[], partyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawBackground = () => {
    try {
      // PNG full-bleed (source is PNG; JPEG also works if you swap MIME)
      doc.addImage(PDF_BG_IMAGE, "PNG", 0, 0, pageWidth, pageHeight);
    } catch {
      // solid cream fallback
      doc.setFillColor(247, 241, 230);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }
  };

  drawBackground();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text("WALLET STATEMENT", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Party : ${partyName}`, 14, 26);

  let totalDebit = 0;
  let totalCredit = 0;

  const body = entriesList.map((row, i) => {
    if (row.debit != null && row.debit > 0) totalDebit += row.debit;
    if (row.credit != null && row.credit > 0) totalCredit += row.credit;
    const dateStr = row.date.includes("T") || row.date.includes("-")
      ? (() => {
          try {
            return format(parseISO(row.date), "dd/MM/yyyy");
          } catch {
            return row.date;
          }
        })()
      : row.date;
    return [
      String(i + 1),
      dateStr,
      row.partyName,
      row.debit != null && row.debit > 0 ? inrPlain(row.debit) : "",
      row.credit != null && row.credit > 0 ? inrPlain(row.credit) : "",
      row.method,
      row.note || "",
    ];
  });

  autoTable(doc, {
    startY: 34,
    margin: { left: 14, right: 14 },
    head: [["No.", "Date", "Party Name", "Debit", "Credit", "Method", "Note"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: [50, 50, 50],
      fillColor: [255, 255, 255],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      cellPadding: 1.6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [25, 102, 172],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.5,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 22 },
      2: { halign: "left", cellWidth: 32 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "left", cellWidth: 20 },
      6: { halign: "left", cellWidth: 50 },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawBackground();
        // small header on continuation pages
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("WALLET STATEMENT (cont.)", 14, 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Party : ${partyName}`, 14, 17);
      }
      // Footer every page
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const gen = `Generated on ${format(new Date(), "dd/MM/yyyy")}`;
      doc.text(gen, pageWidth / 2, pageHeight - 5, { align: "center" });
    },
  });

  // Totals strip
  // @ts-expect-error lastAutoTable injected by plugin
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY + 8;

  const boxX = 14;
  const boxW = pageWidth - 28;
  const boxH = 10;

  doc.setFillColor(240, 240, 240);
  doc.rect(boxX, finalY, boxW, boxH, "F");
  doc.setDrawColor(25, 102, 172);
  doc.setLineWidth(0.4);
  doc.line(boxX, finalY, boxX + boxW, finalY);
  doc.line(boxX, finalY + boxH, boxX + boxW, finalY + boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("TOTAL", 17, finalY + 7);

  doc.text(inrPlain(totalDebit), 100, finalY + 7, { align: "right" });
  doc.text(inrPlain(totalCredit), 124, finalY + 7, { align: "right" });

  doc.text("NET BALANCE", 128, finalY + 7);
  const net = totalCredit - totalDebit;
  const netLabel =
    net === 0 ? "Rs. 0" : net > 0 ? `Rs. ${inrPlain(net)}` : `- Rs. ${inrPlain(Math.abs(net))}`;
  doc.text(netLabel, pageWidth - 17, finalY + 7, { align: "right" });

  const safe = partyName.replace(/[^\w\s-]/g, "").trim() || "party";
  doc.save(`WalletStatement_${safe}_${Date.now()}.pdf`);
}

/** Build rows from ledger entries for one party and export. */
export function downloadPartyStatementPdf(
  partyName: string,
  partyId: string,
  entries: Entry[],
  accounts: Account[],
) {
  const list = liveEntries(entries)
    .filter((e) => e.partyId === partyId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const rows: WalletPdfRow[] = list.map((e) => {
    const isCredit = e.type === "receive";
    return {
      date: e.date,
      partyName,
      debit: isCredit ? null : e.amount,
      credit: isCredit ? e.amount : null,
      method: methodName(accounts, e.accountId),
      note: e.notes || "",
    };
  });

  exportToPDF(rows, partyName);
}
