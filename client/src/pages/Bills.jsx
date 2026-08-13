import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import {
  fetchBills,
  createBill,
  payBill,
  deleteBill,
} from "../features/bills/billsSlice";
import { fetchAccounts } from "../features/accounts/accountsSlice";
import { fetchCategories } from "../features/categories/categoriesSlice";
import { formatMoney, formatDate } from "../utils/format";
const emptyForm = {
  name: "",
  amount: "",
  dueDate: "",
  recurrence: "none",
  account: "",
  category: "",
  reminderDaysBefore: 3,
};
const STATUS_BADGE = {
  overdue: "bg-red-100 text-red-700",
  upcoming: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  paid: "bg-green-100 text-green-700",
};
export default function Bills() {
  const dispatch = useDispatch();
  const { items: bills, status } = useSelector((state) => state.bills);
  const { items: accounts } = useSelector((state) => state.accounts);
  const { items: categories } = useSelector((state) => state.categories);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  useEffect(() => {
    dispatch(fetchBills());
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
      reminderDaysBefore: Number(form.reminderDaysBefore),
    };
    if (!payload.category) delete payload.category;
    const result = await dispatch(createBill(payload));
    if (createBill.fulfilled.match(result)) {
      toast.success("Bill added");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to add bill");
    }
  }
  async function handlePay(bill) {
    const result = await dispatch(payBill(bill.id));
    if (payBill.fulfilled.match(result)) {
      toast.success(`Marked "${bill.name}" as paid`);
      dispatch(fetchAccounts());
    } else {
      toast.error(result.payload || "Failed to mark paid");
    }
  }
  async function handleDelete(bill) {
    if (!confirm(`Delete bill "${bill.name}"?`)) return;
    const result = await dispatch(deleteBill(bill.id));
    if (deleteBill.fulfilled.match(result)) {
      toast.success("Bill deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  const expenseCategories = categories.filter((c) => c.type === "expense");
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bills & Reminders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Never miss a due date.
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
              <Plus className="h-4 w-4" /> Add bill
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
              Name
            </label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Rent"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
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
              Due date
            </label>
            <input
              name="dueDate"
              type="date"
              required
              value={form.dueDate}
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
              <option value="none">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pay from account
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category (optional)
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add bill
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
        {status === "succeeded" && bills.length === 0 && (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            No bills yet.
          </p>
        )}
        {bills.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Recurrence</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {formatDate(b.dueDate, dateFormat)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {formatMoney(b.amount, "USD")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {b.recurrence === "none" ? "One-time" : b.recurrence}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[b.status]}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {b.status !== "paid" && (
                      <button
                        onClick={() => handlePay(b)}
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(b)}
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
