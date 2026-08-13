import ExcelJS from "exceljs";
const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: {
    argb: "FF2F4BC0",
  },
};
const HEADER_FONT = {
  color: {
    argb: "FFFFFFFF",
  },
  bold: true,
};
function addHeaderRow(sheet, columns) {
  sheet.columns = columns;
  const row = sheet.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
}
export function buildFinTrackWorkbook({ transactions, budgets, netWorth }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinTrack";
  workbook.created = new Date();
  const txSheet = workbook.addWorksheet("Transactions");
  addHeaderRow(txSheet, [
    {
      header: "Date",
      key: "date",
      width: 14,
    },
    {
      header: "Description",
      key: "description",
      width: 32,
    },
    {
      header: "Type",
      key: "type",
      width: 12,
    },
    {
      header: "Amount",
      key: "amount",
      width: 14,
    },
    {
      header: "Category",
      key: "category",
      width: 20,
    },
    {
      header: "Account",
      key: "account",
      width: 20,
    },
  ]);
  for (const t of transactions) {
    txSheet.addRow({
      date: t.date.toISOString().slice(0, 10),
      description: t.description || "",
      type: t.type,
      amount: t.amount,
      category: t.category?.name || "",
      account: t.account?.name || "",
    });
  }
  txSheet.getColumn("amount").numFmt = "#,##0.00";
  const budgetSheet = workbook.addWorksheet("Budgets");
  addHeaderRow(budgetSheet, [
    {
      header: "Category",
      key: "category",
      width: 22,
    },
    {
      header: "Period",
      key: "period",
      width: 12,
    },
    {
      header: "Limit",
      key: "limit",
      width: 14,
    },
    {
      header: "Spent",
      key: "spent",
      width: 14,
    },
    {
      header: "Remaining",
      key: "remaining",
      width: 14,
    },
    {
      header: "% Used",
      key: "percentUsed",
      width: 10,
    },
    {
      header: "Status",
      key: "status",
      width: 12,
    },
  ]);
  for (const b of budgets) {
    budgetSheet.addRow({
      category: b.categoryLabel,
      period: b.period,
      limit: b.effectiveLimit,
      spent: b.spent,
      remaining: b.remaining,
      percentUsed: b.percentUsed,
      status: b.status,
    });
  }
  ["limit", "spent", "remaining"].forEach((key) => {
    budgetSheet.getColumn(key).numFmt = "#,##0.00";
  });
  const netWorthSheet = workbook.addWorksheet("Net Worth");
  addHeaderRow(netWorthSheet, [
    {
      header: "Currency",
      key: "currency",
      width: 14,
    },
    {
      header: "Subtotal",
      key: "subtotal",
      width: 16,
    },
    {
      header: `Converted (${netWorth.baseCurrency})`,
      key: "converted",
      width: 20,
    },
    {
      header: "Rate",
      key: "rate",
      width: 12,
    },
  ]);
  for (const row of netWorth.breakdown) {
    netWorthSheet.addRow(row);
  }
  const totalRow = netWorthSheet.addRow({
    currency: "Total",
    converted: netWorth.netWorth,
  });
  totalRow.font = {
    bold: true,
  };
  ["subtotal", "converted"].forEach((key) => {
    netWorthSheet.getColumn(key).numFmt = "#,##0.00";
  });
  return workbook;
}
