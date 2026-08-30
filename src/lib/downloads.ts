import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";

export type DownloadResult =
  | { ok: true; path: string }
  | { ok: false; cancelled: true }
  | { ok: false; error: string };

export interface ReceiptPdfData {
  pharmacyName: string;
  location?: string;
  receiptNumber: string;
  date: string;
  currency: string;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  total: number;
  paid: number;
  change: number;
  labels: {
    title: string;
    receiptNo: string;
    date: string;
    item: string;
    qty: string;
    unitPrice: string;
    amount: string;
    total: string;
    paid: string;
    change: string;
    thankYou: string;
  };
}

function rowsToCsv(rows: string[][]): string {
  const body = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  return `\uFEFF${body}`;
}

function escapePdfText(value: string): string {
  const ascii = String(value ?? "")
    .replace(/\r\n/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, " ");
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 3))}...`;
}

function estimateTextWidth(text: string, size: number): number {
  return String(text).split("").reduce((w, ch) => w + (ch === " " ? size * 0.28 : size * 0.52), 0);
}

class PdfWriter {
  private ops: string[] = [];

  text(x: number, y: number, text: string, size = 10, gray = 0.12) {
    this.ops.push("BT", `/F1 ${size} Tf`, `${gray} ${gray} ${gray + 0.06} rg`, `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${escapePdfText(text)}) Tj`, "ET");
  }

  textBold(x: number, y: number, text: string, size = 10) {
    this.ops.push("BT", `/F2 ${size} Tf`, "0.12 0.14 0.18 rg", `${x.toFixed(2)} ${y.toFixed(2)} Td`, `(${escapePdfText(text)}) Tj`, "ET");
  }

  textMuted(x: number, y: number, text: string, size = 10) {
    this.text(x, y, text, size, 0.45);
  }

  textCenter(centerX: number, y: number, text: string, size = 10, bold = false) {
    const x = centerX - estimateTextWidth(text, size) / 2;
    if (bold) this.textBold(x, y, text, size);
    else this.text(x, y, text, size);
  }

  textRight(rightX: number, y: number, text: string, size = 10, bold = false) {
    const x = rightX - estimateTextWidth(text, size);
    if (bold) this.textBold(x, y, text, size);
    else this.text(x, y, text, size);
  }

  hLine(x1: number, y: number, x2: number) {
    this.ops.push("0.82 0.82 0.82 RG", "0.5 w", `${x1.toFixed(2)} ${y.toFixed(2)} m`, `${x2.toFixed(2)} ${y.toFixed(2)} l`, "S");
  }

  toBytes(): Uint8Array {
    const stream = this.ops.join("\n");
    const streamLength = utf8ByteLength(stream);
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n",
      `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(utf8ByteLength(pdf));
      pdf += obj;
    }
    const xrefPos = utf8ByteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }
}

function formatPlainCurrency(amount: number, currency: string): string {
  const value = safeNumber(amount);
  const code = (currency || "RWF").trim() || "RWF";
  try {
    return new Intl.NumberFormat("en-RW", { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toLocaleString()} ${code}`;
  }
}

function buildTablePdf(title: string, subtitle: string, headers: string[], rows: string[][]): Uint8Array {
  const pdf = new PdfWriter();
  const left = 40;
  const right = 572;
  const tableW = right - left;
  const colCount = Math.max(headers.length, 1);
  const colW = headers.map((_, i) => (i === 0 ? tableW * 0.45 : (tableW * 0.55) / Math.max(colCount - 1, 1)));
  let y = 740;

  pdf.textBold(left, y, title, 16);
  y -= 18;
  pdf.textMuted(left, y, subtitle, 10);
  y -= 22;
  pdf.hLine(left, y, right);
  y -= 16;

  let cx = left;
  headers.forEach((h, i) => {
    if (i === 0) pdf.textBold(cx, y, h, 10);
    else pdf.textBold(cx + colW[i] - estimateTextWidth(h, 10), y, h, 10);
    cx += colW[i];
  });
  y -= 14;
  pdf.hLine(left, y, right);
  y -= 16;

  rows.forEach((row) => {
    cx = left;
    row.forEach((cell, i) => {
      const text = truncate(String(cell), i === 0 ? 42 : 22);
      if (i === 0) pdf.text(cx, y, text, 9);
      else pdf.textRight(cx + colW[i], y, text, 9);
      cx += colW[i];
    });
    y -= 18;
    pdf.hLine(left, y + 8, right);
    y -= 4;
  });

  return pdf.toBytes();
}

/** Matches the POS receipt popup: centered header, Item | Qty | Amount, totals below. */
function buildReceiptPdf(data: ReceiptPdfData): Uint8Array {
  const items = data.items.length ? data.items : [{ name: "Item", quantity: 0, unitPrice: 0, lineTotal: 0 }];
  const pdf = new PdfWriter();
  const left = 72;
  const right = 540;
  const center = (left + right) / 2;
  const qtyRight = 408;
  const amountRight = right;
  let y = 720;

  pdf.textCenter(center, y, data.pharmacyName || "Retail Store", 14, true);
  y -= 18;
  if (data.location) {
    pdf.textCenter(center, y, data.location, 10);
    y -= 16;
  }
  pdf.textCenter(center, y, data.receiptNumber, 10);
  y -= 14;
  pdf.textCenter(center, y, data.date, 10);
  y -= 18;
  pdf.hLine(left, y, right);
  y -= 20;

  pdf.textBold(left, y, data.labels.item, 10);
  pdf.textRight(qtyRight, y, data.labels.qty, 10, true);
  pdf.textRight(amountRight, y, data.labels.amount, 10, true);
  y -= 14;
  pdf.hLine(left, y, right);
  y -= 18;

  items.forEach((item) => {
    pdf.text(left, y, truncate(item.name || "Item", 36), 10);
    pdf.textRight(qtyRight, y, String(safeNumber(item.quantity)), 10);
    pdf.textRight(amountRight, y, formatPlainCurrency(safeNumber(item.lineTotal), data.currency), 10);
    y -= 20;
  });

  y -= 4;
  pdf.hLine(left, y, right);
  y -= 20;

  pdf.textBold(left, y, data.labels.total, 10);
  pdf.textRight(amountRight, y, formatPlainCurrency(data.total, data.currency), 10, true);
  y -= 18;
  pdf.text(left, y, data.labels.paid, 10);
  pdf.textRight(amountRight, y, formatPlainCurrency(data.paid, data.currency), 10);
  y -= 18;
  pdf.text(left, y, data.labels.change, 10);
  pdf.textRight(amountRight, y, formatPlainCurrency(data.change, data.currency), 10);

  return pdf.toBytes();
}

function browserDownloadBlob(filename: string, data: string | Uint8Array, mime: string) {
  const parts: BlobPart[] = data instanceof Uint8Array ? [Uint8Array.from(data)] : [data];
  const blob = new Blob(parts, { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function savePdfFile(defaultName: string, bytes: Uint8Array, dialogTitle: string): Promise<DownloadResult> {
  if (bytes.length < 32) return { ok: false, error: "Generated PDF was empty." };
  if (!isTauri()) {
    browserDownloadBlob(defaultName, bytes, "application/pdf");
    return { ok: true, path: defaultName };
  }
  try {
    const path = await save({
      defaultPath: defaultName,
      title: dialogTitle,
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });
    if (!path) return { ok: false, cancelled: true };
    await writeFile(path, Uint8Array.from(bytes));
    return { ok: true, path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function downloadCsv(filename: string, rows: string[][]): Promise<DownloadResult> {
  const name = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const content = rowsToCsv(rows);
  if (!isTauri()) {
    browserDownloadBlob(name, content, "text/csv;charset=utf-8");
    return { ok: true, path: name };
  }
  try {
    const path = await save({
      defaultPath: name,
      title: "Save Excel Report",
      filters: [{ name: "Excel (CSV)", extensions: ["csv"] }],
    });
    if (!path) return { ok: false, cancelled: true };
    await writeTextFile(path, content);
    return { ok: true, path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function downloadPdf(title: string, rows: string[][]): Promise<DownloadResult> {
  const safeName = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").toLowerCase() || "report";
  const name = `${safeName}.pdf`;
  const headers = rows[0] ?? ["Column 1"];
  const body = rows.slice(1);
  const bytes = buildTablePdf(title, `Ubumwe RMS · ${new Date().toLocaleString()}`, headers, body);
  return savePdfFile(name, bytes, "Save PDF Report");
}

export async function downloadReceiptPdf(data: ReceiptPdfData): Promise<DownloadResult> {
  try {
    const receiptNo = String(data.receiptNumber || "receipt").replace(/[^\w-]/g, "_");
    return await savePdfFile(`receipt_${receiptNo}.pdf`, buildReceiptPdf(data), "Save Receipt PDF");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
