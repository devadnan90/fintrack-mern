import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Tesseract from "tesseract.js";
import {
  Plus,
  Camera,
  Upload,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Paperclip,
  X,
  Repeat,
  SplitSquareHorizontal,
  Tag as TagIcon,
  RotateCcw,
  Trash,
} from "lucide-react";
import { parseReceiptText } from "../utils/receiptParser";
import { resizeImageToDataUrl } from "../utils/imageResize";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  restoreTransaction,
  bulkRestoreTransactions,
} from "../features/transactions/transactionsSlice";
import { fetchAccounts } from "../features/accounts/accountsSlice";
import { fetchCategories } from "../features/categories/categoriesSlice";
import { formatMoney, formatDate } from "../utils/format";
import CsvImportWizard from "../components/CsvImportWizard";
import TrashModal from "../components/TrashModal";
const emptyForm = {
  account: "",
  toAccount: "",
  category: "",
  type: "expense",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  tags: "",
  attachmentUrl: "",
};
export default function Transactions() {
  const dispatch = useDispatch();
  const {
    items: transactions,
    pagination,
    status,
  } = useSelector((state) => state.transactions);
  const { items: accounts } = useSelector((state) => state.accounts);
  const { items: categories } = useSelector((state) => state.categories);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const fileInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [useSplit, setUseSplit] = useState(false);
  const [splitRows, setSplitRows] = useState([
    {
      category: "",
      amount: "",
    },
    {
      category: "",
      amount: "",
    },
  ]);
  const [filters, setFilters] = useState({
    account: "",
    category: "",
    type: "",
    search: "",
    tag: "",
  });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    dispatch(fetchAccounts());
    dispatch(fetchCategories());
  }, [dispatch]);
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setSearchParams(
        (params) => {
          params.delete("new");
          return params;
        },
        {
          replace: true,
        },
      );
    }
  }, []);
  useEffect(() => {
    const params = {
      page,
      limit: 25,
    };
    if (filters.account) params.account = filters.account;
    if (filters.category) params.category = filters.category;
    if (filters.type) params.type = filters.type;
    if (filters.search) params.search = filters.search;
    if (filters.tag) params.tag = filters.tag;
    dispatch(fetchTransactions(params));
    setSelectedIds([]);
  }, [dispatch, filters, page]);
  function handleFilterChange(e) {
    setFilters((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
    setPage(1);
  }
  function handleFormChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  function startEdit(t) {
    setEditingId(t.id);
    setForm({
      account: t.account?.id || "",
      toAccount: t.toAccount?.id || "",
      category: t.category?.id || "",
      type: t.type,
      amount: String(t.amount),
      date: new Date(t.date).toISOString().slice(0, 10),
      description: t.description || "",
      tags: (t.tags || []).join(", "),
      attachmentUrl: t.attachmentUrl || "",
    });
    if (t.splits?.length > 0) {
      setUseSplit(true);
      setSplitRows(
        t.splits.map((s) => ({
          category: s.category?.id || "",
          amount: String(s.amount),
        })),
      );
    } else {
      setUseSplit(false);
      setSplitRows([
        {
          category: "",
          amount: "",
        },
        {
          category: "",
          amount: "",
        },
      ]);
    }
    setShowForm(true);
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setUseSplit(false);
    setSplitRows([
      {
        category: "",
        amount: "",
      },
      {
        category: "",
        amount: "",
      },
    ]);
    setShowForm(false);
  }
  function updateSplitRow(index, field, value) {
    setSplitRows((rows) =>
      rows.map((r, i) =>
        i === index
          ? {
              ...r,
              [field]: value,
            }
          : r,
      ),
    );
  }
  function addSplitRow() {
    setSplitRows((rows) => [
      ...rows,
      {
        category: "",
        amount: "",
      },
    ]);
  }
  function removeSplitRow(index) {
    setSplitRows((rows) => rows.filter((_, i) => i !== index));
  }
  const splitTotal = splitRows.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0,
  );
  const splitRemaining = Number(form.amount || 0) - splitTotal;
  async function handleSubmit(e) {
    e.preventDefault();
    if (useSplit) {
      if (
        splitRows.length < 2 ||
        splitRows.some((r) => !r.category || !r.amount)
      ) {
        toast.error("Every split needs a category and an amount");
        return;
      }
      if (Math.abs(splitRemaining) > 0.005) {
        toast.error(
          `Splits must add up to the total (${splitRemaining > 0 ? "short" : "over"} by ${formatMoney(Math.abs(splitRemaining), "USD")})`,
        );
        return;
      }
    }
    const payload = {
      ...form,
      amount: Number(form.amount),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      splits: useSplit
        ? splitRows.map((r) => ({
            category: r.category,
            amount: Number(r.amount),
          }))
        : [],
    };
    if (payload.type !== "transfer") delete payload.toAccount;
    if (payload.type === "transfer") delete payload.category;
    const action = editingId
      ? updateTransaction({
          id: editingId,
          payload,
        })
      : createTransaction(payload);
    const result = await dispatch(action);
    if (
      (editingId ? updateTransaction : createTransaction).fulfilled.match(
        result,
      )
    ) {
      toast.success(editingId ? "Transaction updated" : "Transaction added");
      if (result.payload?.roundUp) {
        toast.success(
          `Rounded up ${formatMoney(result.payload.roundUp.amount, "USD")} to savings`,
        );
      }
      resetForm();
      dispatch(fetchAccounts());
      dispatch(
        fetchTransactions({
          page,
          limit: 25,
        }),
      );
    } else {
      toast.error(result.payload || "Save failed");
    }
  }
  function showUndoToast(message, onUndo) {
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          {message}
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await onUndo();
            }}
            className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            <RotateCcw className="h-3 w-3" /> Undo
          </button>
        </span>
      ),
      {
        duration: 6000,
      },
    );
  }
  async function handleDelete(t) {
    const result = await dispatch(deleteTransaction(t.id));
    if (deleteTransaction.fulfilled.match(result)) {
      dispatch(fetchAccounts());
      showUndoToast("Transaction deleted", async () => {
        const restoreResult = await dispatch(restoreTransaction(t.id));
        if (restoreTransaction.fulfilled.match(restoreResult)) {
          toast.success("Restored");
          dispatch(fetchAccounts());
          dispatch(
            fetchTransactions({
              page,
              limit: 25,
            }),
          );
        } else {
          toast.error(restoreResult.payload || "Failed to restore");
        }
      });
      dispatch(
        fetchTransactions({
          page,
          limit: 25,
        }),
      );
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  function toggleSelected(id) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }
  function toggleSelectAllOnPage() {
    setSelectedIds((ids) =>
      ids.length === transactions.length ? [] : transactions.map((t) => t.id),
    );
  }
  async function handleBulkDelete() {
    const ids = selectedIds;
    setBulkBusy(true);
    const result = await dispatch(bulkDeleteTransactions(ids));
    setBulkBusy(false);
    if (bulkDeleteTransactions.fulfilled.match(result)) {
      setSelectedIds([]);
      dispatch(fetchAccounts());
      dispatch(
        fetchTransactions({
          page,
          limit: 25,
        }),
      );
      showUndoToast(
        `Deleted ${result.payload.deletedCount} transaction(s)`,
        async () => {
          const restoreResult = await dispatch(bulkRestoreTransactions(ids));
          if (bulkRestoreTransactions.fulfilled.match(restoreResult)) {
            toast.success(
              `Restored ${restoreResult.payload.restoredCount} transaction(s)`,
            );
            dispatch(fetchAccounts());
            dispatch(
              fetchTransactions({
                page,
                limit: 25,
              }),
            );
          } else {
            toast.error(restoreResult.payload || "Failed to restore");
          }
        },
      );
    } else {
      toast.error(result.payload || "Bulk delete failed");
    }
  }
  async function handleBulkSetCategory() {
    if (!bulkCategory) return;
    setBulkBusy(true);
    const result = await dispatch(
      bulkUpdateTransactions({
        ids: selectedIds,
        category: bulkCategory,
      }),
    );
    setBulkBusy(false);
    if (bulkUpdateTransactions.fulfilled.match(result)) {
      const { categoryUpdatedCount, categorySkippedCount } = result.payload;
      toast.success(
        categorySkippedCount > 0
          ? `Categorized ${categoryUpdatedCount} (skipped ${categorySkippedCount} transfer/split transactions)`
          : `Categorized ${categoryUpdatedCount} transaction(s)`,
      );
      setBulkCategory("");
      dispatch(
        fetchTransactions({
          page,
          limit: 25,
        }),
      );
    } else {
      toast.error(result.payload || "Bulk categorize failed");
    }
  }
  async function handleBulkTag(mode) {
    const tag = bulkTag.trim();
    if (!tag) return;
    setBulkBusy(true);
    const payload = {
      ids: selectedIds,
      [mode === "add" ? "addTags" : "removeTags"]: [tag],
    };
    const result = await dispatch(bulkUpdateTransactions(payload));
    setBulkBusy(false);
    if (bulkUpdateTransactions.fulfilled.match(result)) {
      toast.success(
        mode === "add"
          ? `Added #${tag} to ${selectedIds.length} transaction(s)`
          : `Removed #${tag} from ${selectedIds.length} transaction(s)`,
      );
      setBulkTag("");
      dispatch(
        fetchTransactions({
          page,
          limit: 25,
        }),
      );
    } else {
      toast.error(result.payload || "Bulk tag update failed");
    }
  }
  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    e.target.value = "";
  }
  function handleImported({ imported, skipped, errors }) {
    toast.success(
      `Imported ${imported}, skipped ${skipped}${errors.length ? `, ${errors.length} error(s)` : ""}`,
    );
    dispatch(fetchAccounts());
    dispatch(
      fetchTransactions({
        page,
        limit: 25,
      }),
    );
  }
  async function handleReceiptFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowForm(true);
    setIsScanning(true);
    const scanToast = toast.loading("Scanning receipt...");
    try {
      resizeImageToDataUrl(file, 1000)
        .then((dataUrl) =>
          setForm((f) => ({
            ...f,
            attachmentUrl: dataUrl,
          })),
        )
        .catch(() => {});
      const { data } = await Tesseract.recognize(file, "eng");
      const { amount, date, merchant } = parseReceiptText(data.text || "");
      setForm((f) => ({
        ...f,
        type: "expense",
        amount: amount !== null ? String(amount) : f.amount,
        date: date || f.date,
        description: merchant || f.description,
      }));
      if (amount === null && !date && !merchant) {
        toast.error(
          "Couldn't read that receipt clearly — fill the details in manually",
          {
            id: scanToast,
          },
        );
      } else {
        toast.success(
          "Receipt scanned — double-check the details before saving",
          {
            id: scanToast,
          },
        );
      }
    } catch (err) {
      toast.error("Receipt scan failed", {
        id: scanToast,
      });
    } finally {
      setIsScanning(false);
      e.target.value = "";
    }
  }
  const relevantCategories = categories.filter((c) => c.type === form.type);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every income, expense, and transfer in one list.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*"
            onChange={handleReceiptFile}
            className="hidden"
          />
          <button
            onClick={() => receiptInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />{" "}
            {isScanning ? "Scanning..." : "Scan receipt"}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowTrash(true)}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Trash className="h-4 w-4" /> Trash
          </button>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add transaction
              </>
            )}
          </button>
        </div>
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
              onChange={handleFormChange}
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
              onChange={handleFormChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              name="date"
              type="date"
              required
              value={form.date}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {form.type === "transfer" ? "From account" : "Account"}
            </label>
            <select
              name="account"
              required
              value={form.account}
              onChange={handleFormChange}
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
                onChange={handleFormChange}
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
          ) : !useSplit ? (
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
                <button
                  type="button"
                  onClick={() => setUseSplit(true)}
                  className="flex items-center gap-1 text-xs font-normal text-brand-600 hover:underline"
                >
                  <SplitSquareHorizontal className="h-3 w-3" /> Split
                </button>
              </label>
              <select
                name="category"
                required
                value={form.category}
                onChange={handleFormChange}
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
          ) : null}

          {form.type !== "transfer" && useSplit && (
            <div className="sm:col-span-3 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Split across categories
                </p>
                <button
                  type="button"
                  onClick={() => setUseSplit(false)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Use one category instead
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {splitRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={row.category}
                      onChange={(e) =>
                        updateSplitRow(i, "category", e.target.value)
                      }
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
                    >
                      <option value="">Select category...</option>
                      {relevantCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={row.amount}
                      onChange={(e) =>
                        updateSplitRow(i, "amount", e.target.value)
                      }
                      className="w-28 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm"
                    />
                    {splitRows.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeSplitRow(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={addSplitRow}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  + Add another category
                </button>
                <p
                  className={`text-xs ${Math.abs(splitRemaining) > 0.005 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}
                >
                  {Math.abs(splitRemaining) > 0.005
                    ? `${splitRemaining > 0 ? "Remaining" : "Over by"}: ${formatMoney(Math.abs(splitRemaining), "USD")}`
                    : "Splits match total"}
                </p>
              </div>
            </div>
          )}

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags
            </label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleFormChange}
              placeholder="e.g. work, reimbursable, vacation"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Comma-separated
            </p>
          </div>
          {form.attachmentUrl && (
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Receipt
              </label>
              <div className="mt-1 flex items-center gap-3">
                <img
                  src={form.attachmentUrl}
                  alt="Receipt preview"
                  className="h-16 w-16 rounded-md object-cover ring-1 ring-gray-200 dark:ring-gray-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      attachmentUrl: "",
                    }))
                  }
                  className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  <X className="h-3.5 w-3.5" /> Remove receipt
                </button>
              </div>
            </div>
          )}
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editingId ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <select
          name="account"
          value={filters.account}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          name="search"
          placeholder="Search description..."
          value={filters.search}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
        />
        <input
          name="tag"
          placeholder="Filter by tag..."
          value={filters.tag}
          onChange={handleFilterChange}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selectedIds.length} selected
          </span>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            disabled={bulkBusy}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Set category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkSetCategory}
            disabled={bulkBusy || !bulkCategory}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-60 dark:bg-gray-800 dark:text-brand-300 dark:ring-brand-500/30"
          >
            Apply
          </button>

          <div className="flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5 text-gray-400" />
            <input
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              disabled={bulkBusy}
              placeholder="tag name"
              className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              onClick={() => handleBulkTag("add")}
              disabled={bulkBusy || !bulkTag.trim()}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-60 dark:bg-gray-800 dark:text-brand-300 dark:ring-brand-500/30"
            >
              + Add
            </button>
            <button
              onClick={() => handleBulkTag("remove")}
              disabled={bulkBusy || !bulkTag.trim()}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600"
            >
              − Remove
            </button>
          </div>

          <button
            onClick={handleBulkDelete}
            disabled={bulkBusy}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            onClick={() => setSelectedIds([])}
            disabled={bulkBusy}
            className="text-sm text-gray-500 hover:underline dark:text-gray-400"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        {status === "loading" && (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        )}
        {status === "succeeded" && transactions.length === 0 && (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            No transactions match your filters.
          </p>
        )}
        {transactions.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="w-8 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={
                      transactions.length > 0 &&
                      selectedIds.length === transactions.length
                    }
                    onChange={toggleSelectAllOnPage}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((t) => {
                const color = t.category?.color || "#94a3b8";
                return (
                  <tr
                    key={t.id}
                    className={
                      selectedIds.includes(t.id)
                        ? "bg-brand-50/50 dark:bg-brand-500/5"
                        : undefined
                    }
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelected(t.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(t.date, dateFormat)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      <span className="inline-flex items-center gap-1.5">
                        {t.description || "—"}
                        {t.attachmentUrl && (
                          <a
                            href={t.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View receipt"
                            className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {t.isRecurring && (
                          <span
                            title="Auto-generated from a recurring template"
                            className="text-gray-400 dark:text-gray-500"
                          >
                            <Repeat className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                      {t.tags?.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() =>
                                setFilters((f) => ({
                                  ...f,
                                  tag,
                                }))
                              }
                              className="cursor-pointer rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {t.account?.name}
                    </td>
                    <td className="px-4 py-3">
                      {t.splits?.length > 0 ? (
                        <span
                          title={t.splits
                            .map(
                              (s) =>
                                `${s.category?.name || "Uncategorized"}: ${formatMoney(s.amount, "USD")}`,
                            )
                            .join(", ")}
                          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                        >
                          <SplitSquareHorizontal className="h-3 w-3" /> Split (
                          {t.splits.length})
                        </span>
                      ) : t.category?.name ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${color}1a`,
                            color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: color,
                            }}
                          />
                          {t.category.name}
                        </span>
                      ) : t.type === "transfer" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <ArrowLeftRight className="h-3.5 w-3.5" />{" "}
                          {t.toAccount?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.type === "income" ? "text-green-600 dark:text-green-400" : t.type === "expense" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {t.type === "income" && (
                          <TrendingUp className="h-3.5 w-3.5" />
                        )}
                        {t.type === "expense" && (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {t.type === "income"
                          ? "+"
                          : t.type === "expense"
                            ? "-"
                            : ""}
                        {formatMoney(t.amount, "USD")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <button
                        onClick={() => startEdit(t)}
                        className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
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
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {importFile && (
        <CsvImportWizard
          file={importFile}
          onClose={() => setImportFile(null)}
          onImported={handleImported}
        />
      )}

      {showTrash && (
        <TrashModal
          dateFormat={dateFormat}
          onClose={() => setShowTrash(false)}
          onRestored={() =>
            dispatch(
              fetchTransactions({
                page,
                limit: 25,
              }),
            )
          }
        />
      )}
    </div>
  );
}
