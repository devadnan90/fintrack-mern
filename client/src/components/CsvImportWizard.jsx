import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { transactionsAPI } from "../features/transactions/transactionsAPI";
const FIELD_LABELS = {
  date: "Date",
  description: "Description",
  amount: "Amount *",
  type: "Type",
  category: "Category *",
  account: "Account *",
  tags: "Tags",
};
const FIELD_ORDER = [
  "date",
  "description",
  "amount",
  "type",
  "category",
  "account",
  "tags",
];
const STATUS_META = {
  ok: {
    icon: CheckCircle2,
    className: "text-green-600 dark:text-green-400",
    label: "Ready",
  },
  duplicate: {
    icon: Copy,
    className: "text-amber-600 dark:text-amber-400",
    label: "Duplicate",
  },
  error: {
    icon: AlertCircle,
    className: "text-red-500 dark:text-red-400",
    label: "Error",
  },
};
export default function CsvImportWizard({ file, onClose, onImported }) {
  const [step, setStep] = useState("loading");
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState({});
  const [previewResults, setPreviewResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    transactionsAPI
      .previewImportCsv(file)
      .then((data) => {
        if (cancelled) return;
        setHeaders(data.headers);
        setSampleRows(data.sampleRows);
        setTotalRows(data.totalRows);
        setMapping(data.suggestedMapping);
        setStep("mapping");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Could not read that CSV");
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [file]);
  function handleMappingChange(field, header) {
    setMapping((m) => ({
      ...m,
      [field]: header,
    }));
  }
  async function handleValidate() {
    if (!mapping.amount || !mapping.account) {
      toast.error("Amount and Account columns are required");
      return;
    }
    setBusy(true);
    try {
      const data = await transactionsAPI.previewImportCsv(file, mapping);
      setPreviewResults(data.results);
      setSummary(data.summary);
      setStep("preview");
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    } finally {
      setBusy(false);
    }
  }
  async function handleConfirm() {
    setBusy(true);
    try {
      const results = await transactionsAPI.importCsv(file, mapping);
      onImported(results);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Import transactions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {file.name}
              {totalRows
                ? ` · ${totalRows} row${totalRows === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "loading" && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reading file...
            </p>
          )}

          {step === "mapping" && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Match each field to a column from your file. Fields marked with
                * are required.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FIELD_ORDER.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={mapping[field] || ""}
                      onChange={(e) =>
                        handleMappingChange(field, e.target.value)
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    >
                      <option value="">Not mapped</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {sampleRows.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Preview of your file
                  </p>
                  <div className="mt-2 overflow-x-auto rounded-lg ring-1 ring-gray-100 dark:ring-gray-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                        <tr>
                          {headers.map((h) => (
                            <th key={h} className="whitespace-nowrap px-3 py-2">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {sampleRows.map((row, i) => (
                          <tr key={i}>
                            {headers.map((h) => (
                              <td
                                key={h}
                                className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300"
                              >
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "preview" && summary && (
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                  {summary.ok} ready to import
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  {summary.duplicate} duplicate
                  {summary.duplicate === 1 ? "" : "s"} (will be skipped)
                </span>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  {summary.error} error{summary.error === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 max-h-80 overflow-y-auto rounded-lg ring-1 ring-gray-100 dark:ring-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {previewResults.map((r) => {
                      const meta = STATUS_META[r.status];
                      const Icon = meta.icon;
                      return (
                        <tr key={r.row}>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                            {r.row}
                          </td>
                          <td className={`px-3 py-2 ${meta.className}`}>
                            <span className="inline-flex items-center gap-1">
                              <Icon className="h-3.5 w-3.5" /> {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                            {r.message || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          {step === "mapping" && (
            <>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={busy}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Checking..." : "Preview import"}
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => setStep("mapping")}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy || summary.ok === 0}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? "Importing..." : `Confirm import (${summary.ok})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
