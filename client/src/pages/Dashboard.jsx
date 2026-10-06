import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { reportsAPI } from "../features/reports/reportsAPI";
import { budgetsAPI } from "../features/budgets/budgetsAPI";
import { transactionsAPI } from "../features/transactions/transactionsAPI";
import { formatMoney, formatDate } from "../utils/format";
import DateRangePicker from "../components/DateRangePicker";
import NotificationBell from "../components/NotificationBell";
function pad(n) {
  return String(n).padStart(2, "0");
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, days) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function buildRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const monday = addDays(today, -((day + 6) % 7));
  const sunday = addDays(monday, 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const start3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const start6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fmt = (from, to) => {
    const opts = {
      month: "short",
      day: "numeric",
    };
    const sameYear = from.getFullYear() === to.getFullYear();
    return `${from.toLocaleDateString(undefined, opts)} – ${to.toLocaleDateString(
      undefined,
      {
        ...opts,
        year: sameYear ? undefined : "numeric",
      },
    )}`;
  };
  return [
    {
      key: "week",
      label: "This Week",
      dateFrom: monday,
      dateTo: sunday,
      display: fmt(monday, sunday),
    },
    {
      key: "month",
      label: "This Month",
      dateFrom: startOfMonth,
      dateTo: endOfMonth,
      display: fmt(startOfMonth, endOfMonth),
    },
    {
      key: "last-month",
      label: "Last Month",
      dateFrom: startOfLastMonth,
      dateTo: endOfLastMonth,
      display: fmt(startOfLastMonth, endOfLastMonth),
    },
    {
      key: "3months",
      label: "Last 3 Months",
      dateFrom: start3Months,
      dateTo: endOfMonth,
      display: fmt(start3Months, endOfMonth),
    },
    {
      key: "6months",
      label: "Last 6 Months",
      dateFrom: start6Months,
      dateTo: endOfMonth,
      display: fmt(start6Months, endOfMonth),
    },
  ];
}
function monthLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}
function DeltaBadge({ value, invert = false }) {
  if (value === null || !Number.isFinite(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`mt-1 flex items-center gap-1 text-xs font-medium ${good ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(1)}% vs last month
    </span>
  );
}
const PIE_COLORS = [
  "#3b5fd9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];
export default function Dashboard() {
  const user = useSelector((state) => state.auth.user);
  const firstName = user?.name?.split(" ")[0];
  const ranges = useMemo(() => buildRanges(), []);
  const [rangeKey, setRangeKey] = useState("month");
  const selectedRange = ranges.find((r) => r.key === rangeKey) || ranges[1];
  const [netWorth, setNetWorth] = useState(null);
  const [netWorthError, setNetWorthError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [trend, setTrend] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeTxns, setRangeTxns] = useState([]);
  const [spending, setSpending] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled([
        reportsAPI.netWorth(),
        transactionsAPI.list({
          limit: 5,
        }),
        reportsAPI.trend(6),
        budgetsAPI.list(),
      ]);
      if (cancelled) return;
      const [netWorthResult, recentResult, trendResult, budgetsResult] =
        results;
      if (netWorthResult.status === "fulfilled")
        setNetWorth(netWorthResult.value);
      else
        setNetWorthError(
          netWorthResult.reason?.response?.data?.message ||
            "Could not load net worth",
        );
      if (recentResult.status === "fulfilled")
        setRecent(recentResult.value.transactions);
      if (trendResult.status === "fulfilled") setTrend(trendResult.value.data);
      if (budgetsResult.status === "fulfilled") setBudgets(budgetsResult.value);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setRangeLoading(true);
    async function load() {
      const dateFrom = toISODate(selectedRange.dateFrom);
      const dateToInclusive = toISODate(selectedRange.dateTo);
      const dateToExclusive = toISODate(addDays(selectedRange.dateTo, 1));
      const results = await Promise.allSettled([
        transactionsAPI.list({
          dateFrom,
          dateTo: dateToInclusive,
          limit: 500,
        }),
        reportsAPI.spendingByCategory({
          dateFrom,
          dateTo: dateToExclusive,
        }),
      ]);
      if (cancelled) return;
      const [txnsResult, spendingResult] = results;
      if (txnsResult.status === "fulfilled")
        setRangeTxns(txnsResult.value.transactions);
      if (spendingResult.status === "fulfilled")
        setSpending(spendingResult.value.data);
      setRangeLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedRange]);
  const baseCurrency = netWorth?.baseCurrency || user?.baseCurrency || "USD";
  const rangeIncome = rangeTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const rangeExpense = rangeTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const { incomeDelta, expenseDelta } = useMemo(() => {
    if (trend.length < 2)
      return {
        incomeDelta: null,
        expenseDelta: null,
      };
    const curr = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);
    return {
      incomeDelta: pct(curr.income, prev.income),
      expenseDelta: pct(curr.expense, prev.expense),
    };
  }, [trend]);
  const budgetTotals = useMemo(() => {
    const totalLimit = budgets.reduce((s, b) => s + b.effectiveLimit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const percent =
      totalLimit > 0
        ? Math.min(100, Math.round((totalSpent / totalLimit) * 100))
        : 0;
    return {
      totalLimit,
      totalSpent,
      percent,
      remaining: Math.max(0, totalLimit - totalSpent),
    };
  }, [budgets]);
  const chartData = trend.map((t) => ({
    ...t,
    label: monthLabel(t.period),
  }));
  const circumference = 2 * Math.PI * 42;
  const dashOffset =
    circumference - (budgetTotals.percent / 100) * circumference;
  const cards = [
    {
      label: "Total Balance",
      value: netWorth
        ? formatMoney(netWorth.netWorth, baseCurrency)
        : loading
          ? "…"
          : "—",
      icon: Wallet,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      footer: netWorthError ? (
        <span className="mt-1 block text-xs text-red-500 dark:text-red-400">
          {netWorthError}
        </span>
      ) : null,
    },
    {
      label:
        rangeKey === "month"
          ? "Total Income"
          : `Income (${selectedRange.label})`,
      value: rangeLoading ? "…" : formatMoney(rangeIncome, baseCurrency),
      icon: TrendingUp,
      iconBg: "bg-green-50 dark:bg-green-500/10",
      iconColor: "text-green-600 dark:text-green-400",
      footer: rangeKey === "month" ? <DeltaBadge value={incomeDelta} /> : null,
    },
    {
      label:
        rangeKey === "month"
          ? "Total Expenses"
          : `Expenses (${selectedRange.label})`,
      value: rangeLoading ? "…" : formatMoney(rangeExpense, baseCurrency),
      icon: TrendingDown,
      iconBg: "bg-red-50 dark:bg-red-500/10",
      iconColor: "text-red-500 dark:text-red-400",
      footer:
        rangeKey === "month" ? (
          <DeltaBadge value={expenseDelta} invert />
        ) : null,
    },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's your financial overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            ranges={ranges}
            selectedKey={rangeKey}
            onChange={setRangeKey}
          />
          <NotificationBell />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${card.iconBg}`}
              >
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {card.value}
            </p>
            {card.footer}
          </div>
        ))}

        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Budget Progress
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--ring-track)"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#3b5fd9"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={budgets.length ? dashOffset : circumference}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100">
                {budgets.length ? `${budgetTotals.percent}%` : "—"}
              </span>
            </div>
            <div className="text-sm">
              {budgets.length ? (
                <>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatMoney(budgetTotals.remaining, baseCurrency)} left
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    of {formatMoney(budgetTotals.totalLimit, baseCurrency)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No budgets set yet
                </p>
              )}
              <Link
                to="/budgets"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                View Budget <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Spending Overview
            </h2>
            <span className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedRange.label}
            </span>
          </div>

          {rangeLoading ? (
            <p className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Loading…
            </p>
          ) : spending.length === 0 ? (
            <p className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No expenses recorded in this period.
            </p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spending}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={0}
                      outerRadius={95}
                      paddingAngle={1}
                    >
                      {spending.map((entry, i) => (
                        <Cell
                          key={entry.category}
                          fill={
                            entry.color || PIE_COLORS[i % PIE_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      formatter={(value) => formatMoney(value, baseCurrency)}
                      contentStyle={{
                        backgroundColor: "var(--tooltip-bg)",
                        color: "var(--tooltip-text)",
                        border: "1px solid var(--chart-grid)",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full flex-1 space-y-2.5 text-sm">
                {spending.map((c, i) => (
                  <li
                    key={c.category}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            c.color || PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      {c.category}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatMoney(c.total, baseCurrency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            to="/reports"
            className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            View full report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Income vs Expenses
            </h2>
            <span className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
              Last 6 Months
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-600" /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Expenses
            </span>
          </div>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  left: -10,
                  right: 10,
                  top: 10,
                }}
              >
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b5fd9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b5fd9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--chart-grid)"
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fill: "var(--chart-tick)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: "var(--chart-tick)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <ChartTooltip
                  formatter={(value) => formatMoney(value, baseCurrency)}
                  contentStyle={{
                    backgroundColor: "var(--tooltip-bg)",
                    color: "var(--tooltip-text)",
                    border: "1px solid var(--chart-grid)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#3b5fd9"
                  strokeWidth={2}
                  fill="url(#incomeFill)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#expenseFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Link
            to="/reports"
            className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            View full report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Recent Transactions
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            View All Transactions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No transactions yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 pr-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {recent.map((t) => {
                  const label =
                    t.description || t.category?.name || "Transaction";
                  const color = t.category?.color || "#94a3b8";
                  return (
                    <tr key={t.id}>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(t.date, user?.dateFormat)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{
                              backgroundColor: color,
                            }}
                          >
                            {label.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {t.splits?.length > 0 ? (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            Split ({t.splits.length})
                          </span>
                        ) : t.category?.name ? (
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: `${color}1a`,
                              color,
                            }}
                          >
                            {t.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 capitalize">
                        <span className="inline-flex items-center gap-1">
                          {t.type === "income" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                          ) : t.type === "expense" ? (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                          ) : null}
                          {t.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 pl-1 text-right font-semibold whitespace-nowrap ${t.type === "income" ? "text-green-600 dark:text-green-400" : t.type === "expense" ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {t.type === "income"
                          ? "+"
                          : t.type === "expense"
                            ? "-"
                            : ""}
                        {formatMoney(t.amount, baseCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
