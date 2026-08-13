import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Users2,
  Check,
  X,
  Crown,
  MessageCircle,
  FileDown,
} from "lucide-react";
import {
  fetchSplitBills,
  createSplitBill,
  deleteSplitBill,
  settleParticipant,
} from "../features/splitBills/splitBillsSlice";
import { transactionsAPI } from "../features/transactions/transactionsAPI";
import { splitBillsAPI } from "../features/splitBills/splitBillsAPI";
import { formatMoney, formatDate } from "../utils/format";
import { shareToWhatsApp } from "../utils/whatsapp";
import UpgradeModal from "../components/UpgradeModal";
const emptyRow = {
  name: "",
  email: "",
  shareAmount: "",
};
export default function SplitBills() {
  const dispatch = useDispatch();
  const { items: splits, status } = useSelector((state) => state.splitBills);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const isPremium = useSelector((state) =>
    Boolean(state.auth.user?.premium?.isActive),
  );
  const [showForm, setShowForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [rows, setRows] = useState([
    {
      ...emptyRow,
    },
  ]);
  const [recordAsIncomeFor, setRecordAsIncomeFor] = useState({});
  const [downloadingId, setDownloadingId] = useState(null);
  useEffect(() => {
    dispatch(fetchSplitBills());
  }, [dispatch]);
  useEffect(() => {
    if (!showForm) return;
    setLoadingOptions(true);
    transactionsAPI
      .list({
        type: "expense",
        limit: 50,
      })
      .then((data) => setExpenseOptions(data.transactions))
      .catch(() => toast.error("Failed to load expenses"))
      .finally(() => setLoadingOptions(false));
  }, [showForm]);
  const alreadySplitIds = useMemo(
    () => new Set(splits.map((s) => s.transaction.id)),
    [splits],
  );
  const availableExpenses = expenseOptions.filter(
    (t) => !alreadySplitIds.has(t.id),
  );
  const selectedTransaction = expenseOptions.find(
    (t) => t.id === transactionId,
  );
  const totalShares = rows.reduce(
    (sum, r) => sum + (Number(r.shareAmount) || 0),
    0,
  );
  const remaining = selectedTransaction
    ? selectedTransaction.amount - totalShares
    : null;
  function updateRow(idx, field, value) {
    setRows((rs) =>
      rs.map((r, i) =>
        i === idx
          ? {
              ...r,
              [field]: value,
            }
          : r,
      ),
    );
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      {
        ...emptyRow,
      },
    ]);
  }
  function removeRow(idx) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }
  function resetForm() {
    setTransactionId("");
    setRows([
      {
        ...emptyRow,
      },
    ]);
    setShowForm(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!transactionId) {
      toast.error("Choose an expense to split");
      return;
    }
    if (rows.some((r) => !r.name.trim() || !r.shareAmount)) {
      toast.error("Every participant needs a name and a share amount");
      return;
    }
    if (remaining !== null && remaining < -0.005) {
      toast.error("Shares add up to more than the expense total");
      return;
    }
    const result = await dispatch(
      createSplitBill({
        transaction: transactionId,
        participants: rows.map((r) => ({
          name: r.name.trim(),
          email: r.email.trim(),
          shareAmount: Number(r.shareAmount),
        })),
      }),
    );
    if (createSplitBill.fulfilled.match(result)) {
      toast.success("Split created");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to create split");
    }
  }
  async function handleDelete(split) {
    if (!confirm("Delete this split? The original transaction is unaffected."))
      return;
    const result = await dispatch(deleteSplitBill(split.id));
    if (deleteSplitBill.fulfilled.match(result)) {
      toast.success("Split deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  function handleRemind(split, participant) {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    const description = split.transaction.description || "our shared expense";
    const message = `Hi ${participant.name}! Just a friendly reminder — you owe ${formatMoney(participant.shareAmount, "USD")} for ${description}. Thanks! 🙏`;
    shareToWhatsApp(message);
  }
  async function handleDownloadReceipt(split, participant) {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    setDownloadingId(participant.id);
    try {
      const blob = await splitBillsAPI.downloadReceipt(
        split.id,
        participant.id,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payment-request-${participant.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingId(null);
    }
  }
  async function handleSettle(split, participant) {
    const recordAsIncome = Boolean(recordAsIncomeFor[participant.id]);
    const result = await dispatch(
      settleParticipant({
        id: split.id,
        participantId: participant.id,
        recordAsIncome,
      }),
    );
    if (settleParticipant.fulfilled.match(result)) {
      toast.success(
        `Marked ${participant.name} as paid${recordAsIncome ? " and logged the repayment" : ""}`,
      );
    } else {
      toast.error(result.payload || "Failed to mark as paid");
    }
  }
  const totalOwedToYou = splits.reduce((sum, s) => sum + s.totalOutstanding, 0);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Shared Expenses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Split a bill you paid with other people and track who's paid you
            back.
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
              <Plus className="h-4 w-4" /> Split an expense
            </>
          )}
        </button>
      </div>

      {totalOwedToYou > 0 && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-200 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/30">
          You're owed {formatMoney(totalOwedToYou, "USD")} total
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Expense
            </label>
            <select
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={loadingOptions}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">
                {loadingOptions ? "Loading..." : "Select an expense..."}
              </option>
              {availableExpenses.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatDate(t.date, dateFormat)} —{" "}
                  {t.description || "(no description)"} —{" "}
                  {formatMoney(t.amount, "USD")}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Participants (other than you)
            </label>
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  placeholder="Name"
                  required
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <input
                  placeholder="Email (optional)"
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(idx, "email", e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <input
                  placeholder="Share"
                  type="number"
                  step="0.01"
                  required
                  value={row.shareAmount}
                  onChange={(e) =>
                    updateRow(idx, "shareAmount", e.target.value)
                  }
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add another person
            </button>
          </div>

          {selectedTransaction && (
            <p
              className={`mt-3 text-sm ${remaining < -0.005 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
            >
              {remaining < -0.005
                ? `Over by ${formatMoney(Math.abs(remaining), "USD")}`
                : `${formatMoney(remaining, "USD")} of ${formatMoney(selectedTransaction.amount, "USD")} is your own share`}
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create split
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {status === "succeeded" && splits.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-10 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
            <Users2 className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No shared expenses yet.
            </p>
          </div>
        )}
        {splits.map((split) => (
          <div
            key={split.id}
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {split.transaction.description || "(no description)"}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(split.transaction.date, dateFormat)} · Total{" "}
                  {formatMoney(split.transaction.amount, "USD")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(split)}
                className="flex items-center gap-1 text-xs text-red-500 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>

            <ul className="mt-3 divide-y divide-gray-50 dark:divide-gray-700">
              {split.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {p.name}
                    </span>
                    <span className="ml-2 text-gray-400 dark:text-gray-500">
                      {formatMoney(p.shareAmount, "USD")}
                    </span>
                  </div>
                  {p.settled ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <Check className="h-3.5 w-3.5" /> Paid
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={Boolean(recordAsIncomeFor[p.id])}
                          onChange={(e) =>
                            setRecordAsIncomeFor((m) => ({
                              ...m,
                              [p.id]: e.target.checked,
                            }))
                          }
                        />
                        Log as income
                      </label>
                      <button
                        onClick={() => handleRemind(split, p)}
                        title="Remind via WhatsApp"
                        className="rounded-md bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {isPremium ? (
                          <MessageCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(split, p)}
                        disabled={downloadingId === p.id}
                        title="Download payment request PDF"
                        className="rounded-md bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {isPremium ? (
                          <FileDown className="h-3.5 w-3.5" />
                        ) : (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSettle(split, p)}
                        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        Mark paid
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {!split.fullySettled && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {formatMoney(split.totalOutstanding, "USD")} still owed to you
              </p>
            )}
          </div>
        ))}
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
