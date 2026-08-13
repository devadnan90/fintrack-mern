import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, Trash2, Pause, Play, Repeat } from "lucide-react";
import {
  fetchRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "../features/recurringTransactions/recurringTransactionsSlice";
import { fetchAccounts } from "../features/accounts/accountsSlice";
import { fetchCategories } from "../features/categories/categoriesSlice";
import { formatMoney, formatDate } from "../utils/format";
const emptyForm = {
  type: "expense",
  account: "",
  toAccount: "",
  category: "",
  amount: "",
  description: "",
  recurrence: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};
export default function RecurringTransactions() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.recurringTransactions);
  const { items: accounts } = useSelector((state) => state.accounts);
  const { items: categories } = useSelector((state) => state.categories);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  useEffect(() => {
    dispatch(fetchRecurringTransactions());
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
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
    const payload = {
      ...form,
      amount: Number(form.amount),
    };
    if (payload.type !== "transfer") delete payload.toAccount;
    if (payload.type === "transfer") delete payload.category;
    if (!payload.endDate) delete payload.endDate;
    const result = await dispatch(createRecurringTransaction(payload));
    if (createRecurringTransaction.fulfilled.match(result)) {
      toast.success("Recurring transaction created");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to create recurring transaction");
    }
  }
  async function handleToggleActive(item) {
    const result = await dispatch(
      updateRecurringTransaction({
        id: item.id,
        payload: {
          isActive: !item.isActive,
        },
      }),
    );
    if (updateRecurringTransaction.fulfilled.match(result)) {
      toast.success(item.isActive ? "Paused" : "Resumed");
    } else {
      toast.error(result.payload || "Failed to update");
    }
  }
  async function handleDelete(item) {
    if (
      !confirm(
        `Delete this recurring ${item.type}? Transactions it already created are kept.`,
      )
    )
      return;
    const result = await dispatch(deleteRecurringTransaction(item.id));
    if (deleteRecurringTransaction.fulfilled.match(result)) {
      toast.success("Deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  const relevantCategories = categories.filter((c) => c.type === form.type);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Recurring Transactions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Subscriptions, paychecks, and anything else that happens on a
            schedule — created automatically when due.
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
              <Plus className="h-4 w-4" /> New template
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 sm:grid-cols-3"
        >
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
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Recurrence
            </label>
            <select
              name="recurrence"
              value={form.recurrence}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {form.type === "transfer" ? "From account" : "Account"}
            </label>
            <select
              name="account"
              required
              value={form.account}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {form.type === "transfer" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                To account
              </label>
              <select
                name="toAccount"
                required
                value={form.toAccount}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {accounts
                  .filter((a) => a.id !== form.account)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {relevantCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Starts on
            </label>
            <input
              name="startDate"
              type="date"
              required
              value={form.startDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ends on (optional)
            </label>
            <input
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Netflix, rent, paycheck..."
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create template
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
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Repeat className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recurring transactions yet.
            </p>
          </div>
        )}
        {items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Recurrence</th>
                <th className="px-4 py-2">Next</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((t) => (
                <tr key={t.id} className={t.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {t.description ||
                      (t.category?.name ??
                        (t.type === "transfer"
                          ? `Transfer to ${t.toAccount?.name}`
                          : t.type))}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium whitespace-nowrap ${t.type === "income" ? "text-green-600 dark:text-green-400" : t.type === "expense" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {t.type === "income"
                      ? "+"
                      : t.type === "expense"
                        ? "-"
                        : ""}
                    {formatMoney(t.amount, "USD")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">
                    {t.recurrence}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(t.nextDueDate, dateFormat)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${t.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                    >
                      {t.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                    >
                      {t.isActive ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {t.isActive ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="ml-3 inline-flex items-center gap-1 text-red-500 dark:text-red-400 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
