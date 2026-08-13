import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  Crown,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import {
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../features/budgets/budgetsSlice";
import { fetchCategories } from "../features/categories/categoriesSlice";
import { fetchHouseholds } from "../features/households/householdsSlice";
import {
  fetchBudgetTemplates,
  createBudgetTemplate,
  deleteBudgetTemplate,
  applyBudgetTemplate,
} from "../features/budgetTemplates/budgetTemplatesSlice";
import { formatMoney } from "../utils/format";
import UpgradeModal from "../components/UpgradeModal";
const emptyForm = {
  scope: "personal",
  category: "",
  household: "",
  categoryName: "",
  amount: "",
  period: "monthly",
  rollover: false,
};
const STATUS_STYLES = {
  "on-track": "bg-green-500",
  approaching: "bg-amber-500",
  exceeded: "bg-red-500",
};
const STATUS_BADGE = {
  "on-track": "bg-green-50 dark:bg-green-500/10 text-green-700",
  approaching: "bg-amber-50 dark:bg-amber-500/10 text-amber-700",
  exceeded: "bg-red-50 dark:bg-red-500/10 text-red-700",
};
export default function Budgets() {
  const dispatch = useDispatch();
  const { items: budgets, status } = useSelector((state) => state.budgets);
  const { items: categories } = useSelector((state) => state.categories);
  const { items: households } = useSelector((state) => state.households);
  const { items: templates } = useSelector((state) => state.budgetTemplates);
  const isPremium = useSelector((state) =>
    Boolean(state.auth.user?.premium?.isActive),
  );
  const [showForm, setShowForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    period: "monthly",
    rollover: false,
  });
  useEffect(() => {
    dispatch(fetchBudgets());
    dispatch(fetchCategories());
    dispatch(fetchHouseholds());
    dispatch(fetchBudgetTemplates());
  }, [dispatch]);
  async function handleSaveTemplate() {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    const personal = budgets.filter((b) => !b.household);
    if (personal.length === 0) {
      toast.error("No personal budgets to save as a template");
      return;
    }
    const name = prompt('Name this template (e.g. "New month reset")');
    if (!name || !name.trim()) return;
    const items = personal.map((b) => ({
      categoryName: b.category?.name || b.categoryName,
      amount: b.amount,
      period: b.period,
      rollover: b.rollover,
    }));
    const result = await dispatch(
      createBudgetTemplate({
        name: name.trim(),
        items,
      }),
    );
    if (createBudgetTemplate.fulfilled.match(result)) {
      toast.success("Template saved");
    } else {
      toast.error(result.payload || "Failed to save template");
    }
  }
  async function handleApplyTemplate(template) {
    setApplyingId(template.id);
    const result = await dispatch(applyBudgetTemplate(template.id));
    setApplyingId(null);
    if (applyBudgetTemplate.fulfilled.match(result)) {
      const { created, skipped } = result.payload;
      if (created.length > 0) dispatch(fetchBudgets());
      if (created.length === 0) {
        toast.error(
          skipped[0]?.reason
            ? `Nothing applied — ${skipped[0].reason.toLowerCase()}`
            : "Nothing to apply",
        );
      } else if (skipped.length > 0) {
        toast.success(
          `Applied ${created.length} budget(s), skipped ${skipped.length}`,
        );
      } else {
        toast.success(`Applied ${created.length} budget(s)`);
      }
    } else {
      toast.error(result.payload || "Failed to apply template");
    }
  }
  async function handleDeleteTemplate(template) {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    const result = await dispatch(deleteBudgetTemplate(template.id));
    if (deleteBudgetTemplate.fulfilled.match(result)) {
      toast.success("Template deleted");
    } else {
      toast.error(result.payload || "Failed to delete template");
    }
  }
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  }
  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const payload =
      form.scope === "household"
        ? {
            household: form.household,
            categoryName: form.categoryName,
            amount: Number(form.amount),
            period: form.period,
            rollover: form.rollover,
          }
        : {
            category: form.category,
            amount: Number(form.amount),
            period: form.period,
            rollover: form.rollover,
          };
    const result = await dispatch(createBudget(payload));
    if (createBudget.fulfilled.match(result)) {
      toast.success("Budget created");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to create budget");
    }
  }
  function startEdit(budget) {
    setEditId(budget.id);
    setEditForm({
      amount: budget.amount,
      period: budget.period,
      rollover: budget.rollover,
    });
  }
  function handleEditChange(e) {
    const { name, value, type, checked } = e.target;
    setEditForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  }
  async function handleEditSubmit(e, budget) {
    e.preventDefault();
    const result = await dispatch(
      updateBudget({
        id: budget.id,
        payload: {
          ...editForm,
          amount: Number(editForm.amount),
        },
      }),
    );
    if (updateBudget.fulfilled.match(result)) {
      toast.success("Budget updated");
      setEditId(null);
    } else {
      toast.error(result.payload || "Failed to update budget");
    }
  }
  async function handleDelete(budget) {
    const label = budget.category?.name || budget.categoryName;
    if (!confirm(`Delete the budget for "${label}"?`)) return;
    const result = await dispatch(deleteBudget(budget.id));
    if (deleteBudget.fulfilled.match(result)) {
      toast.success("Budget deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const usedCategoryIds = new Set(
    budgets.filter((b) => b.category).map((b) => b.category.id),
  );
  const availableCategories = expenseCategories.filter(
    (c) => !usedCategoryIds.has(c.id),
  );
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Keep spending on track, category by category.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {isPremium ? (
              <LayoutTemplate className="h-4 w-4" />
            ) : (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            Save as template
          </button>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="h-4 w-4" /> New budget
              </>
            )}
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mt-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <Sparkles className="h-3.5 w-3.5" /> Budget templates
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 py-1 pl-3 pr-1.5 text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {t.name}{" "}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({t.items.length})
                  </span>
                </span>
                <button
                  onClick={() => handleApplyTemplate(t)}
                  disabled={applyingId === t.id}
                  className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {applyingId === t.id ? "Applying..." : "Apply"}
                </button>
                <button
                  onClick={() => handleDeleteTemplate(t)}
                  className="rounded-full p-1 text-gray-400 hover:text-red-500"
                  title="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 sm:grid-cols-4"
        >
          {households.length > 0 && (
            <div className="sm:col-span-4">
              <div className="flex gap-1 rounded-md bg-gray-100 p-1 dark:bg-gray-700 w-fit">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      scope: "personal",
                    }))
                  }
                  className={`rounded px-3 py-1.5 text-xs font-medium ${form.scope === "personal" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      scope: "household",
                    }))
                  }
                  className={`rounded px-3 py-1.5 text-xs font-medium ${form.scope === "household" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
                >
                  Household
                </button>
              </div>
            </div>
          )}
          {form.scope === "household" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Household
                </label>
                <select
                  name="household"
                  required
                  value={form.household}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category name
                </label>
                <input
                  name="categoryName"
                  list="budget-category-names"
                  required
                  placeholder="e.g. Groceries"
                  value={form.categoryName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
                />
                <datalist id="budget-category-names">
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Matched against each member's own category with this name.
                </p>
              </div>
            </>
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
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              Period
            </label>
            <select
              name="period"
              value={form.period}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                name="rollover"
                checked={form.rollover}
                onChange={handleChange}
              />
              Roll over unused budget
            </label>
          </div>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create budget
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {status === "succeeded" && budgets.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No budgets yet. Create one above.
          </p>
        )}
        {budgets.map((b) => (
          <div
            key={b.id}
            className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                  {b.category?.name || b.categoryName}
                  {b.household && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      <Users className="h-2.5 w-2.5" /> {b.household.name}
                    </span>
                  )}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {b.period}
                    {b.rollover ? " · rollover" : ""}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[b.status]}`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    editId === b.id ? setEditId(null) : startEdit(b)
                  }
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>

            {editId === b.id ? (
              <form
                onSubmit={(e) => handleEditSubmit(e, b)}
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  value={editForm.amount}
                  onChange={handleEditChange}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                />
                <select
                  name="period"
                  value={editForm.period}
                  onChange={handleEditChange}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    name="rollover"
                    checked={editForm.rollover}
                    onChange={handleEditChange}
                  />
                  Rollover
                </label>
                <div className="flex gap-2 sm:col-span-3">
                  <button
                    type="submit"
                    className="rounded-md bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="text-sm text-gray-500 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatMoney(b.spent, "USD")} spent
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    of {formatMoney(b.effectiveLimit, "USD")}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full ${STATUS_STYLES[b.status]}`}
                    style={{
                      width: `${Math.min(100, b.percentUsed)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {b.status === "exceeded"
                    ? `Over budget by ${formatMoney(b.spent - b.effectiveLimit, "USD")}`
                    : `${formatMoney(b.remaining, "USD")} remaining`}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
