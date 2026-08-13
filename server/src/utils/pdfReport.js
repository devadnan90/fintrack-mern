import PDFDocument from "pdfkit";
function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${(amount ?? 0).toFixed(2)} ${currency || ""}`.trim();
  }
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
const PAGE_MARGIN = 50;
const COLORS = {
  heading: "#111827",
  body: "#374151",
  muted: "#6b7280",
  rule: "#e5e7eb",
  brand: "#3b5fd9",
};
function resetX(doc) {
  doc.x = PAGE_MARGIN;
}
function drawSectionTitle(doc, text) {
  resetX(doc);
  doc.moveDown(0.75);
  resetX(doc);
  doc
    .fillColor(COLORS.heading)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(text, PAGE_MARGIN, doc.y);
  doc.moveDown(0.25);
  resetX(doc);
  doc
    .strokeColor(COLORS.rule)
    .lineWidth(1)
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .stroke();
  doc.moveDown(0.5);
  resetX(doc);
}
function drawTable(doc, { columns, rows }) {
  resetX(doc);
  const startX = doc.x;
  const rowHeight = 20;
  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.heading);
    const y = doc.y;
    let x = startX;
    for (const col of columns) {
      doc.text(col.label, x, y, {
        width: col.width,
        align: col.align || "left",
      });
      x += col.width;
    }
    doc.y = y;
    doc.moveDown(0.6);
    doc
      .strokeColor(COLORS.rule)
      .moveTo(startX, doc.y)
      .lineTo(startX + columns.reduce((s, c) => s + c.width, 0), doc.y)
      .stroke();
    doc.moveDown(0.3);
  }
  drawHeader();
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.body);
  for (const row of rows) {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      drawHeader();
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.body);
    }
    const y = doc.y;
    let x = startX;
    for (const col of columns) {
      doc.text(String(row[col.key] ?? ""), x, y, {
        width: col.width,
        align: col.align || "left",
      });
      x += col.width;
    }
    doc.y = y;
    doc.moveDown(0.85);
  }
  resetX(doc);
}
export function generateReportPdf(
  res,
  { user, range, netWorth, spendingByCategory, income, expense, transactions },
) {
  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
  });
  doc.pipe(res);
  const currency = netWorth.baseCurrency;
  doc
    .fillColor(COLORS.brand)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("FinTrack Report");
  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .font("Helvetica")
    .text(`${user.name} · ${user.email}`);
  doc.text(`Period: ${formatDate(range.start)} – ${formatDate(range.end)}`);
  doc.text(`Generated: ${formatDate(new Date())}`);
  drawSectionTitle(doc, "Net Worth");
  doc
    .fillColor(COLORS.body)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(money(netWorth.netWorth, currency));
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
  if (netWorth.breakdown.length > 1) {
    for (const b of netWorth.breakdown) {
      doc.text(
        `${b.currency}: ${money(b.subtotal, b.currency)} -> ${money(b.converted, currency)}`,
      );
    }
  }
  if (netWorth.conversionErrors.length) {
    doc
      .fillColor("#b45309")
      .text(
        `Note: could not convert ${netWorth.conversionErrors.map((e) => e.currency).join(", ")} to ${currency}.`,
      );
  }
  drawSectionTitle(doc, "Income vs. Expense (this period)");
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.body);
  doc.text(`Income: ${money(income, currency)}`);
  doc.text(`Expense: ${money(expense, currency)}`);
  doc.font("Helvetica-Bold").text(`Net: ${money(income - expense, currency)}`);
  drawSectionTitle(doc, "Spending by Category");
  if (spendingByCategory.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text("No expenses recorded in this period.");
  } else {
    drawTable(doc, {
      columns: [
        {
          key: "category",
          label: "Category",
          width: 220,
        },
        {
          key: "count",
          label: "Txns",
          width: 60,
          align: "right",
        },
        {
          key: "total",
          label: "Total",
          width: 120,
          align: "right",
        },
      ],
      rows: spendingByCategory.map((c) => ({
        category: c.category,
        count: c.count,
        total: money(c.total, currency),
      })),
    });
  }
  drawSectionTitle(doc, `Transactions (${transactions.length})`);
  if (transactions.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text("No transactions in this period.");
  } else {
    drawTable(doc, {
      columns: [
        {
          key: "date",
          label: "Date",
          width: 70,
        },
        {
          key: "description",
          label: "Description",
          width: 150,
        },
        {
          key: "category",
          label: "Category",
          width: 90,
        },
        {
          key: "account",
          label: "Account",
          width: 90,
        },
        {
          key: "amount",
          label: "Amount",
          width: 90,
          align: "right",
        },
      ],
      rows: transactions.map((t) => ({
        date: formatDate(t.date),
        description: t.description || "—",
        category: t.category || "—",
        account: t.account || "—",
        amount: `${t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}${money(t.amount, currency)}`,
      })),
    });
  }
  doc.end();
}
