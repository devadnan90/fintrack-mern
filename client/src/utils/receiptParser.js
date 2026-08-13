const TOTAL_LINE =
  /\b(?:total|amount due|balance due|grand total)\b\s*[:$]?\s*\$?\s*(\d{1,6}[.,]\d{2})/i;
const ANY_MONEY = /\$?\s*(\d{1,6}[.,]\d{2})/g;
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const SLASH_DATE = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
const DASH_DATE = /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/;
const TEXT_DATE = /\b([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})\b/;
function pad(n) {
  return String(n).padStart(2, "0");
}
function fullYear(y) {
  if (y.length === 4) return Number(y);
  const n = Number(y);
  return n < 70 ? 2000 + n : 1900 + n;
}
function parseDate(text) {
  const iso = text.match(ISO_DATE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = text.match(SLASH_DATE);
  if (slash) {
    const [, mm, dd, yyyy] = slash;
    return `${fullYear(yyyy)}-${pad(mm)}-${pad(dd)}`;
  }
  const dash = text.match(DASH_DATE);
  if (dash) {
    const [, mm, dd, yyyy] = dash;
    return `${fullYear(yyyy)}-${pad(mm)}-${pad(dd)}`;
  }
  const textual = text.match(TEXT_DATE);
  if (textual) {
    const d = new Date(textual[1]);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }
  return null;
}
export function parseReceiptText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let amount = null;
  const totalMatch = text.match(TOTAL_LINE);
  if (totalMatch) {
    amount = parseFloat(totalMatch[1].replace(",", "."));
  } else {
    const candidates = [...text.matchAll(ANY_MONEY)]
      .map((m) => parseFloat(m[1].replace(",", ".")))
      .filter((n) => !Number.isNaN(n));
    if (candidates.length) amount = Math.max(...candidates);
  }
  const date = parseDate(text);
  const merchant =
    lines.find((l) => /[a-zA-Z]{3,}/.test(l) && l.length < 40) || null;
  return {
    amount,
    date,
    merchant,
  };
}
