import { parse } from "csv-parse/sync";
import Transaction from "../models/Transaction.js";
import { toCents } from "./currency.js";
import { matchRule } from "./merchantRules.js";
export const TARGET_FIELDS = [
  "date",
  "description",
  "amount",
  "type",
  "category",
  "account",
  "tags",
];
const GUESS_CANDIDATES = {
  date: ["date", "transactiondate", "postdate", "postingdate"],
  description: [
    "description",
    "memo",
    "payee",
    "details",
    "narrative",
    "merchant",
  ],
  amount: ["amount", "amt", "value", "debit", "credit"],
  type: ["type", "transactiontype"],
  category: ["category", "cat"],
  account: ["account", "accountname"],
  tags: ["tags", "labels"],
};
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}
export const MAX_IMPORT_ROWS = 1000;
export function parseCsvBuffer(buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}
export function guessMapping(headers) {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalize(h),
  }));
  const mapping = {};
  for (const field of TARGET_FIELDS) {
    const candidates = GUESS_CANDIDATES[field];
    const match = normalizedHeaders.find((h) =>
      candidates.includes(h.normalized),
    );
    mapping[field] = match ? match.original : "";
  }
  return mapping;
}
function applyMapping(row, mapping) {
  const get = (field) => {
    const header = mapping?.[field];
    return header ? row[header] : row[field];
  };
  return {
    date: get("date"),
    description: get("description"),
    amount: get("amount"),
    type: get("type"),
    category: get("category"),
    account: get("account"),
    tags: get("tags"),
  };
}
export async function evaluateRow(
  userId,
  rawRow,
  mapping,
  { accountByName, categoryByName, merchantRules = [] },
) {
  const mapped = applyMapping(rawRow, mapping);
  const type = (mapped.type || "expense").toLowerCase();
  if (!["income", "expense", "transfer"].includes(type)) {
    return {
      status: "error",
      message: `invalid type "${mapped.type}"`,
    };
  }
  const account = accountByName.get((mapped.account || "").toLowerCase());
  if (!account) {
    return {
      status: "error",
      message: mapped.account
        ? `unknown account "${mapped.account}"`
        : "no account column mapped",
    };
  }
  let category = null;
  let autoCategorized = false;
  if (type !== "transfer") {
    category = categoryByName.get((mapped.category || "").toLowerCase());
    if (!category) {
      const matchedRule = matchRule(merchantRules, mapped.description);
      if (matchedRule) {
        category = {
          _id: matchedRule.category,
        };
        autoCategorized = true;
      } else {
        return {
          status: "error",
          message: mapped.category
            ? `unknown category "${mapped.category}"`
            : "no category column mapped",
        };
      }
    }
  }
  const amount = Number(mapped.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return {
      status: "error",
      message: `invalid amount "${mapped.amount}"`,
    };
  }
  const date = mapped.date ? new Date(mapped.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return {
      status: "error",
      message: `invalid date "${mapped.date}"`,
    };
  }
  const description = mapped.description || "";
  const tags = mapped.tags
    ? String(mapped.tags)
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  const duplicate = await Transaction.findOne({
    user: userId,
    account: account._id,
    amount: toCents(amount),
    description,
    date: {
      $gte: dayStart,
      $lte: dayEnd,
    },
  });
  const data = {
    user: userId,
    account: account._id,
    category: category ? category._id : null,
    type,
    amount: toCents(amount),
    date,
    description,
    tags,
  };
  if (duplicate) {
    return {
      status: "duplicate",
      message: "matches an existing transaction",
      data,
      autoCategorized,
    };
  }
  return {
    status: "ok",
    data,
    autoCategorized,
  };
}
