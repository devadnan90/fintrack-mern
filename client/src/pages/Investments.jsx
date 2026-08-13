import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2 } from "lucide-react";
import {
  fetchInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "../features/investments/investmentsSlice";
import { formatMoney } from "../utils/format";
const TYPES = ["crypto", "stock", "other"];
const emptyForm = {
  name: "",
  type: "crypto",
  symbol: "",
  quantity: "",
  purchasePrice: "",
  currency: "USD",
};
const SOURCE_LABEL = {
  live: {
    text: "Live price",
    className: "bg-green-100 text-green-700",
  },
  manual: {
    text: "Manual price",
    className: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  },
  "purchase-price": {
    text: "Using purchase price",
    className: "bg-amber-100 text-amber-700",
  },
};
export default function Investments() {
  const dispatch = useDispatch();
  const { items, portfolio, status } = useSelector(
    (state) => state.investments,
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [manualEditId, setManualEditId] = useState(null);
  const [manualValue, setManualValue] = useState("");
  useEffect(() => {
    dispatch(fetchInvestments());
  }, [dispatch]);
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(
      createInvestment({
        ...form,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
      }),
    );
    if (createInvestment.fulfilled.match(result)) {
      toast.success("Investment added");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to add investment");
    }
  }
  async function handleDelete(inv) {
    if (!confirm(`Remove "${inv.name}" from your portfolio?`)) return;
    const result = await dispatch(deleteInvestment(inv.id));
    if (deleteInvestment.fulfilled.match(result)) {
      toast.success("Investment removed");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  async function saveManualPrice(inv) {
    const result = await dispatch(
      updateInvestment({
        id: inv.id,
        payload: {
          manualPrice: Number(manualValue),
        },
      }),
    );
    if (updateInvestment.fulfilled.match(result)) {
      toast.success("Price updated");
      setManualEditId(null);
    } else {
      toast.error(result.payload || "Update failed");
    }
  }
  const gainPositive = portfolio.gainLoss >= 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Investments
        </h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add holding
            </>
          )}
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Crypto prices update live via CoinGecko. Stock prices need an Alpha
        Vantage API key in the server's{" "}
        <code className="rounded bg-gray-100 dark:bg-gray-700 px-1">.env</code>{" "}
        — without one, update the price manually below.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-start justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Portfolio value
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMoney(portfolio.currentValue, "USD")}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cost basis</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMoney(portfolio.costBasis, "USD")}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-start justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gain / loss
            </p>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${gainPositive ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"}`}
            >
              {gainPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${gainPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {gainPositive ? "+" : ""}
            {formatMoney(portfolio.gainLoss, "USD")}
          </p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 sm:grid-cols-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Bitcoin"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Symbol{" "}
              {form.type === "crypto"
                ? "(CoinGecko id, e.g. bitcoin)"
                : form.type === "stock"
                  ? "(ticker, e.g. AAPL)"
                  : "(optional)"}
            </label>
            <input
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              placeholder={form.type === "crypto" ? "bitcoin" : "AAPL"}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity
            </label>
            <input
              name="quantity"
              type="number"
              step="any"
              required
              value={form.quantity}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Purchase price (per unit)
            </label>
            <input
              name="purchasePrice"
              type="number"
              step="0.01"
              required
              value={form.purchasePrice}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency
            </label>
            <input
              name="currency"
              value={form.currency}
              onChange={handleChange}
              maxLength={3}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm uppercase"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add holding
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        {status === "loading" && (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        )}
        {status === "succeeded" && items.length === 0 && (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            No holdings yet. Add your first one above.
          </p>
        )}
        {items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Gain/Loss</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((inv) => {
                const badge =
                  SOURCE_LABEL[inv.priceSource] || SOURCE_LABEL.manual;
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {inv.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {inv.type}
                        {inv.symbol ? ` · ${inv.symbol}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {inv.quantity}
                    </td>
                    <td className="px-4 py-3">
                      {manualEditId === inv.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={manualValue}
                            onChange={(e) => setManualValue(e.target.value)}
                            className="w-24 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => saveManualPrice(inv)}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">
                            {formatMoney(inv.currentPrice, inv.currency)}
                          </span>
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                          {inv.priceSource !== "live" && (
                            <button
                              onClick={() => {
                                setManualEditId(inv.id);
                                setManualValue(
                                  String(inv.manualPrice ?? inv.purchasePrice),
                                );
                              }}
                              className="ml-2 text-xs text-brand-600 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {formatMoney(inv.currentValue, inv.currency)}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${inv.gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {inv.gainLoss >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {inv.gainLoss >= 0 ? "+" : ""}
                        {formatMoney(inv.gainLoss, inv.currency)} (
                        {inv.gainLossPercent}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <button
                        onClick={() => handleDelete(inv)}
                        className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
