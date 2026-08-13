import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Download, AlertTriangle, Crown, Share2 } from "lucide-react";
import { reportsAPI } from "../features/reports/reportsAPI";
import { formatMoney } from "../utils/format";
import { shareToWhatsApp } from "../utils/whatsapp";
import UpgradeModal from "../components/UpgradeModal";
const FALLBACK_COLORS = [
  "#3b5fd9",
  "#6b8afc",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
];
const FORECAST_WINDOWS = [30, 90, 180];
export default function Reports() {
  const isPremium = useSelector((state) =>
    Boolean(state.auth.user?.premium?.isActive),
  );
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [netWorthCurrency, setNetWorthCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [forecastDays, setForecastDays] = useState(90);
  const [loadingForecast, setLoadingForecast] = useState(true);
  useEffect(() => {
    Promise.all([
      reportsAPI.spendingByCategory({}),
      reportsAPI.trend(6),
      reportsAPI.netWorthHistory(6),
    ])
      .then(([category, trend, netWorth]) => {
        setCategoryData(category.data);
        setTrendData(trend.data);
        setNetWorthHistory(netWorth.data);
        setNetWorthCurrency(netWorth.baseCurrency);
      })
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!isPremium) {
      setLoadingForecast(false);
      return;
    }
    setLoadingForecast(true);
    reportsAPI
      .cashFlowForecast(forecastDays)
      .then((data) => setForecast(data))
      .catch(() => toast.error("Failed to load cash flow forecast"))
      .finally(() => setLoadingForecast(false));
  }, [forecastDays, isPremium]);
  async function handleExport() {
    setExporting(true);
    try {
      const blob = await reportsAPI.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fintrack-transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }
  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const blob = await reportsAPI.exportPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fintrack-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  }
  async function handleExportXlsx() {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    setExportingXlsx(true);
    try {
      const blob = await reportsAPI.exportXlsx();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fintrack-export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Excel export failed");
    } finally {
      setExportingXlsx(false);
    }
  }
  function handleShareWhatsApp() {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    const latestNetWorth = netWorthHistory[netWorthHistory.length - 1];
    const latestTrend = trendData[trendData.length - 1];
    const topCategories = [...categoryData]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    const lines = ["📊 My FinTrack summary"];
    if (latestNetWorth)
      lines.push(
        `Net worth: ${formatMoney(latestNetWorth.netWorth, netWorthCurrency)}`,
      );
    if (latestTrend) {
      lines.push(
        `This month: +${formatMoney(latestTrend.income, netWorthCurrency)} income, -${formatMoney(latestTrend.expense, netWorthCurrency)} expenses`,
      );
    }
    if (topCategories.length > 0) {
      lines.push(
        `Top spending: ${topCategories.map((c) => `${c.category} (${formatMoney(c.total, netWorthCurrency)})`).join(", ")}`,
      );
    }
    shareToWhatsApp(lines.join("\n"));
  }
  const totalSpending = categoryData.reduce((sum, c) => sum + c.total, 0);
  const forecastSeries = (forecast?.series || []).map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Where your money comes from and where it goes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />{" "}
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />{" "}
            {exportingPdf ? "Exporting..." : "Export PDF"}
          </button>
          <button
            onClick={handleExportXlsx}
            disabled={exportingXlsx}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
          >
            {isPremium ? (
              <Download className="h-4 w-4" />
            ) : (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            {exportingXlsx ? "Exporting..." : "Export Excel"}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {isPremium ? (
              <Share2 className="h-4 w-4" />
            ) : (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            Share via WhatsApp
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Net worth over time (last 6 months)
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        ) : netWorthHistory.every((p) => p.netWorth === 0) ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Not enough history yet to chart a trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={netWorthHistory}>
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b5fd9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b5fd9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="period"
                tick={{
                  fontSize: 12,
                  fill: "var(--chart-tick)",
                }}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "var(--chart-tick)",
                }}
              />
              <Tooltip
                formatter={(value) => formatMoney(value, netWorthCurrency)}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net worth"
                stroke="#3b5fd9"
                strokeWidth={2}
                fill="url(#netWorthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cash flow forecast
          </h2>
          {isPremium && (
            <div className="flex gap-1 rounded-md bg-gray-100 dark:bg-gray-700 p-1">
              {FORECAST_WINDOWS.map((d) => (
                <button
                  key={d}
                  onClick={() => setForecastDays(d)}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${forecastDays === d ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
        </div>

        {!isPremium ? (
          <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
              <Crown className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Cash flow forecast is a Premium feature
            </p>
            <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
              See where your balance is projected to go using upcoming bills,
              recurring transactions, and your spending habits.
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Upgrade to Premium
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Projected using unpaid/recurring bills, active recurring
              transactions, and your average daily spending. A projection, not a
              guarantee.
            </p>
            {loadingForecast ? (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </p>
            ) : (
              <>
                {forecast?.lowBalanceDate && (
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Balance is projected to go negative around{" "}
                    {new Date(forecast.lowBalanceDate).toLocaleDateString(
                      undefined,
                      {
                        month: "long",
                        day: "numeric",
                      },
                    )}
                    .
                  </div>
                )}
                <ResponsiveContainer width="100%" height={240} className="mt-4">
                  <AreaChart data={forecastSeries}>
                    <defs>
                      <linearGradient
                        id="forecastFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--chart-grid)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 12,
                        fill: "var(--chart-tick)",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 12,
                        fill: "var(--chart-tick)",
                      }}
                    />
                    <Tooltip
                      formatter={(value) =>
                        formatMoney(value, forecast?.baseCurrency || "USD")
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="projectedBalance"
                      name="Projected balance"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#forecastFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </>
        )}
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Spending by category (this month)
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </p>
          ) : categoryData.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No expenses recorded this month yet.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={entry.category}
                        fill={
                          entry.color ||
                          FALLBACK_COLORS[i % FALLBACK_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value, "USD")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Total:{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatMoney(totalSpending, "USD")}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Income vs. expenses (last 6 months)
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                />
                <XAxis
                  dataKey="period"
                  tick={{
                    fontSize: 12,
                    fill: "var(--chart-tick)",
                  }}
                />
                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: "var(--chart-tick)",
                  }}
                />
                <Tooltip formatter={(value) => formatMoney(value, "USD")} />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  name="Income"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  fill="#ef4444"
                  name="Expense"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
