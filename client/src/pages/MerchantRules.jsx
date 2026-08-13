import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Wand2, RefreshCw } from "lucide-react";
import {
  fetchMerchantRules,
  createMerchantRule,
  updateMerchantRule,
  deleteMerchantRule,
  applyMerchantRule,
} from "../features/merchantRules/merchantRulesSlice";
import { fetchCategories } from "../features/categories/categoriesSlice";
const emptyForm = {
  pattern: "",
  matchType: "contains",
  category: "",
};
export default function MerchantRules() {
  const dispatch = useDispatch();
  const { items: rules, status } = useSelector((state) => state.merchantRules);
  const { items: categories } = useSelector((state) => state.categories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  useEffect(() => {
    dispatch(fetchMerchantRules());
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
    setEditingId(null);
    setShowForm(false);
  }
  function startEdit(rule) {
    setEditingId(rule.id);
    setForm({
      pattern: rule.pattern,
      matchType: rule.matchType,
      category: rule.category?.id || "",
    });
    setShowForm(true);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.category) {
      toast.error("Choose a category");
      return;
    }
    const result = editingId
      ? await dispatch(
          updateMerchantRule({
            id: editingId,
            payload: form,
          }),
        )
      : await dispatch(createMerchantRule(form));
    if (result.type.endsWith("/fulfilled")) {
      toast.success(editingId ? "Rule updated" : "Rule created");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to save rule");
    }
  }
  async function handleDelete(rule) {
    if (!confirm(`Delete the rule for "${rule.pattern}"?`)) return;
    const result = await dispatch(deleteMerchantRule(rule.id));
    if (deleteMerchantRule.fulfilled.match(result)) {
      toast.success("Rule deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  async function handleApply(rule) {
    setApplyingId(rule.id);
    try {
      const result = await dispatch(applyMerchantRule(rule.id));
      if (applyMerchantRule.fulfilled.match(result)) {
        toast.success(
          `Categorized ${result.payload.updated} past transaction${result.payload.updated === 1 ? "" : "s"}`,
        );
      } else {
        toast.error(result.payload || "Failed to apply rule");
      }
    } finally {
      setApplyingId(null);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Merchant Rules
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Auto-categorize transactions whose description matches a pattern —
            applies to manual entries, CSV imports, and bank sync.
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
              <Plus className="h-4 w-4" /> Add rule
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pattern
              </label>
              <input
                name="pattern"
                required
                placeholder="e.g. starbucks"
                value={form.pattern}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Matched case-insensitively.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Match type
              </label>
              <select
                name="matchType"
                value={form.matchType}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="contains">Contains</option>
                <option value="exact">Exact match</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editingId ? "Save changes" : "Create rule"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        {status === "loading" ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Wand2 className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No rules yet. Add one above to auto-categorize matching
              transactions.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${rule.category?.color || "#3b5fd9"}22`,
                      color: rule.category?.color || "#3b5fd9",
                    }}
                  >
                    {rule.category?.name || "Uncategorized"}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {rule.matchType === "exact" ? "equals" : "contains"} "
                    <span className="font-medium">{rule.pattern}</span>"
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => handleApply(rule)}
                    disabled={applyingId === rule.id}
                    title="Apply to existing uncategorized transactions"
                    className="flex items-center gap-1 text-brand-600 hover:underline disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${applyingId === rule.id ? "animate-spin" : ""}`}
                    />
                    Apply
                  </button>
                  <button
                    onClick={() => startEdit(rule)}
                    className="flex items-center gap-1 text-gray-500 hover:underline dark:text-gray-400"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="flex items-center gap-1 text-red-500 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
