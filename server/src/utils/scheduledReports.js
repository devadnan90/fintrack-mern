import { PassThrough } from "stream";
import Transaction from "../models/Transaction.js";
import {
  computeNetWorth,
  computeSpendingByCategory,
} from "../controllers/reportsController.js";
import { generateReportPdf } from "./pdfReport.js";
import { sendMail } from "./mailer.js";
import { fromCents } from "./currency.js";
export function reportRange(period, now = new Date()) {
  if (period === "monthly") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()),
    );
    return {
      start,
      end: now,
    };
  }
  const start = new Date(now.getTime() - 7 * 86_400_000);
  return {
    start,
    end: now,
  };
}
async function renderReportPdfBuffer(
  user,
  range,
  netWorth,
  spendingByCategory,
  transactions,
  totals,
) {
  return new Promise((resolve, reject) => {
    const sink = new PassThrough();
    const chunks = [];
    sink.on("data", (chunk) => chunks.push(chunk));
    sink.on("end", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);
    generateReportPdf(sink, {
      user,
      range,
      netWorth,
      spendingByCategory,
      income: fromCents(totals.income),
      expense: fromCents(totals.expense),
      transactions: transactions.map((t) => ({
        date: t.date,
        description: t.description,
        type: t.type,
        amount: fromCents(t.amount),
        category: t.category?.name || "",
        account: t.account?.name || "",
      })),
    });
  });
}
function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || ""}`.trim();
  }
}
export async function sendScheduledReport(user, period) {
  const { start, end } = reportRange(period, new Date());
  const [netWorth, spendingByCategory, transactions] = await Promise.all([
    computeNetWorth(user),
    computeSpendingByCategory(user._id, start, end),
    Transaction.find({
      user: user._id,
      date: {
        $gte: start,
        $lt: end,
      },
    })
      .sort({
        date: 1,
      })
      .populate("account", "name")
      .populate("category", "name"),
  ]);
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      if (t.type === "expense") acc.expense += t.amount;
      return acc;
    },
    {
      income: 0,
      expense: 0,
    },
  );
  const currency = netWorth.baseCurrency;
  const topCategories = spendingByCategory.slice(0, 5);
  const label = period === "monthly" ? "Monthly" : "Weekly";
  const pdfBuffer = await renderReportPdfBuffer(
    user,
    {
      start,
      end,
    },
    netWorth,
    spendingByCategory,
    transactions,
    totals,
  );
  const categoryLines = topCategories.length
    ? topCategories
        .map((c) => `  - ${c.category}: ${money(c.total, currency)}`)
        .join("\n")
    : "  (no expenses this period)";
  const categoryRows = topCategories.length
    ? topCategories
        .map(
          (c) =>
            `<tr><td style="padding:4px 12px 4px 0">${c.category}</td><td style="padding:4px 0">${money(c.total, currency)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:4px 0;color:#6b7280">No expenses this period</td></tr>`;
  await sendMail({
    to: user.email,
    subject: `FinTrack: your ${label.toLowerCase()} report`,
    text:
      `Your ${label.toLowerCase()} FinTrack report (${start.toDateString()} - ${end.toDateString()})\n\n` +
      `Net worth: ${money(netWorth.netWorth, currency)}\n` +
      `Income: ${money(fromCents(totals.income), currency)}\n` +
      `Expenses: ${money(fromCents(totals.expense), currency)}\n\n` +
      `Top spending categories:\n${categoryLines}\n\n` +
      `Full detail attached as a PDF.`,
    html:
      `<h2>Your ${label.toLowerCase()} FinTrack report</h2>` +
      `<p style="color:#6b7280">${start.toDateString()} – ${end.toDateString()}</p>` +
      `<p><strong>Net worth:</strong> ${money(netWorth.netWorth, currency)}<br/>` +
      `<strong>Income:</strong> ${money(fromCents(totals.income), currency)}<br/>` +
      `<strong>Expenses:</strong> ${money(fromCents(totals.expense), currency)}</p>` +
      `<p><strong>Top spending categories</strong></p>` +
      `<table>${categoryRows}</table>` +
      `<p>Full detail is attached as a PDF.</p>`,
    attachments: [
      {
        filename: `fintrack-${period}-report.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
  user.scheduledReports.lastSentAt = new Date();
  await user.save();
}
