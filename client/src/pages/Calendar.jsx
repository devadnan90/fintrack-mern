import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Crown,
} from "lucide-react";
import { reportsAPI } from "../features/reports/reportsAPI";
import { formatMoney } from "../utils/format";
import UpgradeModal from "../components/UpgradeModal";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function dayKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isToday(year, month, day) {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
}
export default function Calendar() {
  const currency =
    useSelector((state) => state.auth.user?.baseCurrency) || "USD";
  const isPremium = useSelector((state) =>
    Boolean(state.auth.user?.premium?.isActive),
  );
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    setLoading(true);
    reportsAPI
      .calendar(cursor.year, cursor.month)
      .then(setCalendar)
      .catch(() => toast.error("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, [cursor, isPremium]);
  const dayByKey = useMemo(() => {
    const map = new Map();
    for (const d of calendar?.days || []) map.set(d.date, d);
    return map;
  }, [calendar]);
  const grid = useMemo(() => {
    const firstWeekday = new Date(
      Date.UTC(cursor.year, cursor.month - 1, 1),
    ).getUTCDay();
    const daysInMonth = new Date(
      Date.UTC(cursor.year, cursor.month, 0),
    ).getUTCDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    return cells;
  }, [cursor]);
  function goToMonth(delta) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month - 1 + delta, 1));
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
      };
    });
    setSelectedKey(null);
  }
  function goToToday() {
    setCursor({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    setSelectedKey(null);
  }
  const selectedDay = selectedKey ? dayByKey.get(selectedKey) : null;
  if (!isPremium) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Transactions, bills, and recurring payments at a glance.
        </p>

        <div className="mt-8 flex flex-col items-center rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
            <Crown className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Calendar is a Premium feature
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            See every transaction, bill, and recurring payment laid out on a
            monthly calendar. Upgrade to unlock it.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="mt-5 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Upgrade to Premium
          </button>
        </div>

        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
        />
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Transactions, bills, and recurring payments at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => goToMonth(-1)}
              className="p-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] px-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
              {MONTH_LABELS[cursor.month - 1]} {cursor.year}
            </span>
            <button
              onClick={() => goToMonth(1)}
              className="p-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          {loading ? (
            <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w} className="py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((day, i) => {
                  if (day === null)
                    return (
                      <div
                        key={`blank-${i}`}
                        className="min-h-[5.5rem] rounded-lg"
                      />
                    );
                  const key = dayKey(cursor.year, cursor.month, day);
                  const data = dayByKey.get(key);
                  const hasBills = data?.bills?.length > 0;
                  const hasRecurring = data?.recurring?.length > 0;
                  const hasIncome = data && data.income > 0;
                  const hasExpense = data && data.expense > 0;
                  const overdue = data?.bills?.some(
                    (b) => b.status === "overdue",
                  );
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`flex min-h-[5.5rem] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${selectedKey === key ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday(cursor.year, cursor.month, day) ? "bg-brand-600 text-white" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {day}
                      </span>
                      <div className="flex w-full flex-col gap-0.5">
                        {hasIncome && (
                          <span className="truncate text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatMoney(data.income, currency)}
                          </span>
                        )}
                        {hasExpense && (
                          <span className="truncate text-[11px] font-medium text-red-500 dark:text-red-400">
                            -{formatMoney(data.expense, currency)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {hasBills && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${overdue ? "bg-red-500" : "bg-amber-400"}`}
                              title="Bill due"
                            />
                          )}
                          {hasRecurring && (
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-sky-400"
                              title="Recurring"
                            />
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          {!selectedDay ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Select a day to see the details.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(`${selectedDay.date}T00:00:00Z`).toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    },
                  )}
                </h2>
                <button
                  onClick={() => setSelectedKey(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {selectedDay.transactions.length === 0 &&
                  selectedDay.bills.length === 0 &&
                  selectedDay.recurring.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Nothing on this day.
                    </p>
                  )}

                {selectedDay.transactions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Transactions
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedDay.transactions.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            {t.type === "income" ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                            )}
                            {t.description || t.category || "Transaction"}
                          </span>
                          <span
                            className={
                              t.type === "income"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-500 dark:text-red-400"
                            }
                          >
                            {t.type === "income" ? "+" : "-"}
                            {formatMoney(t.amount, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDay.bills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Bills due
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedDay.bills.map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Receipt
                              className={`h-3.5 w-3.5 ${b.status === "overdue" ? "text-red-500" : "text-amber-500"}`}
                            />
                            {b.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatMoney(b.amount, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDay.recurring.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Upcoming recurring
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedDay.recurring.map((r, i) => (
                        <li
                          key={`${r.id}-${i}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Repeat className="h-3.5 w-3.5 text-sky-500" />
                            {r.description}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatMoney(r.amount, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
