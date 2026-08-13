import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Wallet,
  PiggyBank,
  CreditCard,
  Banknote,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../features/accounts/accountsSlice";
import { formatMoney } from "../utils/format";
const ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"];
const emptyForm = {
  name: "",
  type: "checking",
  institution: "",
  currency: "USD",
  openingBalance: "0",
};
const TYPE_ICON = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Banknote,
};
const TYPE_STYLE = {
  checking: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  savings:
    "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400",
  credit:
    "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  cash: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
};
export default function Accounts() {
  const dispatch = useDispatch();
  const { items: accounts, status } = useSelector((state) => state.accounts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  function startEdit(account) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      institution: account.institution,
      currency: account.currency,
      openingBalance: String(account.openingBalance),
    });
    setShowForm(true);
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      const result = await dispatch(
        updateAccount({
          id: editingId,
          payload: {
            name: form.name,
            type: form.type,
            institution: form.institution,
            currency: form.currency,
          },
        }),
      );
      if (updateAccount.fulfilled.match(result)) {
        toast.success("Account updated");
        resetForm();
      } else {
        toast.error(result.payload || "Update failed");
      }
    } else {
      const result = await dispatch(createAccount(form));
      if (createAccount.fulfilled.match(result)) {
        toast.success("Account created");
        resetForm();
      } else {
        toast.error(result.payload || "Failed to create account");
      }
    }
  }
  async function handleArchive(account) {
    const result = await dispatch(
      updateAccount({
        id: account.id,
        payload: {
          isArchived: !account.isArchived,
        },
      }),
    );
    if (updateAccount.fulfilled.match(result)) {
      toast.success(
        account.isArchived ? "Account restored" : "Account archived",
      );
    } else {
      toast.error(result.payload || "Action failed");
    }
  }
  async function handleDelete(account) {
    if (
      !confirm(
        `Delete "${account.name}"? This only works if it has no transactions.`,
      )
    )
      return;
    const result = await dispatch(deleteAccount(account.id));
    if (deleteAccount.fulfilled.match(result)) {
      toast.success("Account deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All your balances in one place.
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
              <Plus className="h-4 w-4" /> Add account
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 sm:grid-cols-2"
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
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Institution (optional)
            </label>
            <input
              name="institution"
              value={form.institution}
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
          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Opening balance
              </label>
              <input
                name="openingBalance"
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editingId ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading accounts...
          </p>
        )}
        {status === "succeeded" && accounts.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No accounts yet. Add your first one above.
          </p>
        )}
        {accounts.map((account) => {
          const Icon = TYPE_ICON[account.type] || Wallet;
          return (
            <div
              key={account.id}
              className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${TYPE_STYLE[account.type] || TYPE_STYLE.checking}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <Link
                      to={`/accounts/${account.id}`}
                      className="font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                    >
                      {account.name}
                    </Link>
                    <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {account.type}
                    </p>
                  </div>
                </div>
                {account.isArchived && (
                  <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMoney(account.balance, account.currency)}
              </p>
              {account.institution && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {account.institution}
                </p>
              )}
              <div className="mt-4 flex gap-4 border-t border-gray-50 pt-3 text-xs">
                <button
                  onClick={() => startEdit(account)}
                  className="flex items-center gap-1 text-brand-600 hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleArchive(account)}
                  className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:underline"
                >
                  {account.isArchived ? (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {account.isArchived ? "Restore" : "Archive"}
                </button>
                <button
                  onClick={() => handleDelete(account)}
                  className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
