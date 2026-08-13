import Category from "../models/Category.js";
const DEFAULT_EXPENSE_CATEGORIES = [
  {
    name: "Housing",
    icon: "home",
    color: "#ef4444",
  },
  {
    name: "Food & Dining",
    icon: "utensils",
    color: "#f97316",
  },
  {
    name: "Transportation",
    icon: "car",
    color: "#eab308",
  },
  {
    name: "Utilities",
    icon: "bolt",
    color: "#84cc16",
  },
  {
    name: "Shopping",
    icon: "bag",
    color: "#06b6d4",
  },
  {
    name: "Entertainment",
    icon: "film",
    color: "#8b5cf6",
  },
  {
    name: "Health",
    icon: "heart",
    color: "#ec4899",
  },
  {
    name: "Insurance",
    icon: "shield",
    color: "#64748b",
  },
  {
    name: "Personal Care",
    icon: "sparkles",
    color: "#14b8a6",
  },
  {
    name: "Education",
    icon: "book",
    color: "#3b82f6",
  },
  {
    name: "Other Expense",
    icon: "tag",
    color: "#94a3b8",
  },
];
const DEFAULT_INCOME_CATEGORIES = [
  {
    name: "Salary",
    icon: "briefcase",
    color: "#22c55e",
  },
  {
    name: "Freelance",
    icon: "laptop",
    color: "#16a34a",
  },
  {
    name: "Investments",
    icon: "trending-up",
    color: "#15803d",
  },
  {
    name: "Gifts",
    icon: "gift",
    color: "#4ade80",
  },
  {
    name: "Other Income",
    icon: "tag",
    color: "#86efac",
  },
];
export async function seedDefaultCategories(userId) {
  const docs = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
      ...c,
      type: "expense",
      user: userId,
      isDefault: true,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
      ...c,
      type: "income",
      user: userId,
      isDefault: true,
    })),
  ];
  await Category.insertMany(docs);
}
