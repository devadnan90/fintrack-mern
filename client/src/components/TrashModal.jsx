import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, RotateCcw, Trash2 } from "lucide-react";
import { transactionsAPI } from "../features/transactions/transactionsAPI";
import { formatMoney, formatDate } from "../utils/format";
export default function TrashModal({ onClose, onRestored, dateFormat }) {
  const [items, setItems] = useState([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  useEffect(() => {
    transactionsAPI
      .trash()
      .then((data) => {
        setItems(data.transactions);
        setRetentionDays(data.retentionDays);
      })
      .catch(() => toast.error("Failed to load trash"))
      .finally(() => setLoading(false));
  }, []);
  async function handleRestore(t) {
    setBusyId(t.id);
    try {
      await transactionsAPI.restore(t.id);
      setItems((list) => list.filter((i) => i.id !== t.id));
      toast.success("Transaction restored");
      onRestored();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore");
    } finally {
      setBusyId(null);
    }
  }
  async function handlePermanentDelete(t) {
    if (!confirm("Permanently delete this transaction? This can't be undone."))
      return;
    setBusyId(t.id);
    try {
      await transactionsAPI.permanentlyDelete(t.id);
      setItems((list) => list.filter((i) => i.id !== t.id));
      toast.success("Permanently deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Trash
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Deleted transactions are kept for {retentionDays} days before
              being permanently removed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Trash is empty.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.description || t.category?.name || "Transaction"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(t.date, dateFormat)} ·{" "}
                      {formatMoney(t.amount, "USD")} · deleted{" "}
                      {formatDate(t.deletedAt, dateFormat)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleRestore(t)}
                      disabled={busyId === t.id}
                      className="flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:bg-brand-500/10 dark:text-brand-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(t)}
                      disabled={busyId === t.id}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete forever
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
