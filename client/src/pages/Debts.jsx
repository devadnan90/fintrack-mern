import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Flame,
  Snowflake,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  fetchDebts,
  createDebt,
  updateDebt,
  deleteDebt,
} from "../features/debts/debtsSlice";
import { debtsAPI } from "../features/debts/debtsAPI";
import { formatMoney, formatDate } from "../utils/format";
const emptyForm = {
  name: "",
  balance: "",
  apr: "",
  minimumPayment: "",
};
export default function Debts() {
  const dispatch = useDispatch();
  const { items: debts, status } = useSelector((state) => state.debts);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState("0");
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  useEffect(() => {
    dispatch(fetchDebts());
  }, [dispatch]);
  useEffect(() => {
    if (debts.length === 0) {
      setPlan(null);
      return;
    }
    setLoadingPlan(true);
    debtsAPI
      .getPlan(strategy, Number(extraPayment) || 0)
      .then(setPlan)
      .catch(() => toast.error("Failed to calculate payoff plan"))
      .finally(() => setLoadingPlan(false));
  }, [debts, strategy, extraPayment]);
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }
  function startEdit(debt) {
    setEditingId(debt.id);
    setForm({
      name: debt.name,
      balance: String(debt.balance),
      apr: String(debt.apr),
      minimumPayment: String(debt.minimumPayment),
    });
    setShowForm(true);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      balance: Number(form.balance),
      apr: Number(form.apr),
      minimumPayment: Number(form.minimumPayment),
    };
    const action = editingId
      ? updateDebt({
          id: editingId,
          payload,
        })
      : createDebt(payload);
    const result = await dispatch(action);
    if ((editingId ? updateDebt : createDebt).fulfilled.match(result)) {
      toast.success(editingId ? "Debt updated" : "Debt added");
      resetForm();
    } else {
      toast.error(result.payload || "Save failed");
    }
  }
  async function handleDelete(debt) {
    if (!confirm(`Remove "${debt.name}" from the planner?`)) return;
    const result = await dispatch(deleteDebt(debt.id));
    if (deleteDebt.fulfilled.match(result)) {
      toast.success("Removed");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  const planByDebtId = new Map(
    (plan?.perDebt || []).map((d) => [String(d.id), d]),
  );
  const sortedDebts = [...debts].sort((a, b) => {
    const pa = planByDebtId.get(a.id)?.monthsToPayoff ?? Infinity;
    const pb = planByDebtId.get(b.id)?.monthsToPayoff ?? Infinity;
    return pa - pb;
  });
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Debt Payoff Planner
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            See exactly when you'll be debt-free, and how much interest it'll
            cost.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add debt
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 sm:grid-cols-4"
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
              placeholder="Visa card"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Balance
            </label>
            <input
              name="balance"
              type="number"
              step="0.01"
              required
              value={form.balance}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              APR (%)
            </label>
            <input
              name="apr"
              type="number"
              step="0.01"
              required
              value={form.apr}
              onChange={handleChange}
              placeholder="19.99"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Minimum payment
            </label>
            <input
              name="minimumPayment"
              type="number"
              step="0.01"
              required
              value={form.minimumPayment}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editingId ? "Save changes" : "Add debt"}
            </button>
          </div>
        </form>
      )}

      {debts.length === 0 ? (
        status === "succeeded" && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-white dark:bg-gray-800 py-10 text-center shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
            <CreditCard className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No debts added yet. Add one above to build a payoff plan.
            </p>
          </div>
        )
      ) : (
        <>
          <div className="mt-6 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Strategy
                </p>
                <div className="mt-1 flex rounded-md ring-1 ring-gray-200 dark:ring-gray-600">
                  <button
                    onClick={() => setStrategy("avalanche")}
                    className={`flex items-center gap-1.5 rounded-l-md px-3 py-2 text-sm ${strategy === "avalanche" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    <Flame className="h-3.5 w-3.5" /> Avalanche
                  </button>
                  <button
                    onClick={() => setStrategy("snowball")}
                    className={`flex items-center gap-1.5 rounded-r-md px-3 py-2 text-sm ${strategy === "snowball" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    <Snowflake className="h-3.5 w-3.5" /> Snowball
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Extra payment / month
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  className="mt-1 w-40 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm">
                {strategy === "avalanche"
                  ? "Avalanche pays off the highest interest rate first — minimizes total interest paid."
                  : "Snowball pays off the smallest balance first — quicker wins to stay motivated."}
              </p>
            </div>

            {loadingPlan ? (
              <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                Calculating...
              </p>
            ) : plan?.neverPaidOff ? (
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  At this payment level, interest is outpacing what's being paid
                  down — these debts won't be paid off. Increase the extra
                  payment or minimums.
                </p>
              </div>
            ) : plan ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <Calendar className="h-3.5 w-3.5" /> Debt-free by
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatDate(plan.payoffDate, dateFormat)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {plan.months} months from now
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Total interest paid
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatMoney(plan.totalInterestPaid, "USD")}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Total monthly payment
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                    {formatMoney(
                      debts.reduce((sum, d) => sum + d.minimumPayment, 0) +
                        Number(extraPayment || 0),
                      "USD",
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Balance</th>
                  <th className="px-4 py-2">APR</th>
                  <th className="px-4 py-2">Min. payment</th>
                  <th className="px-4 py-2">Paid off in</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedDebts.map((d, i) => {
                  const debtPlan = planByDebtId.get(d.id);
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {formatMoney(d.balance, "USD")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {d.apr}%
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatMoney(d.minimumPayment, "USD")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {debtPlan?.monthsToPayoff
                          ? `${debtPlan.monthsToPayoff} mo`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <button
                          onClick={() => startEdit(d)}
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="ml-3 inline-flex items-center gap-1 text-red-500 dark:text-red-400 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
