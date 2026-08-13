import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Crown,
  Home,
  Utensils,
  Car,
  Bolt,
  ShoppingBag,
  Film,
  Heart,
  Shield,
  Sparkles,
  Book,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  Coffee,
  Plane,
  Smartphone,
  CreditCard,
  Gamepad2,
  PiggyBank,
  Wallet,
  Dumbbell,
  Baby,
  Dog,
  Wrench,
  Palette,
  Music,
  Gem,
} from "lucide-react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../features/categories/categoriesSlice";
import UpgradeModal from "../components/UpgradeModal";
const ICON_MAP = {
  home: Home,
  utensils: Utensils,
  car: Car,
  bolt: Bolt,
  bag: ShoppingBag,
  film: Film,
  heart: Heart,
  shield: Shield,
  sparkles: Sparkles,
  book: Book,
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  "trending-up": TrendingUp,
  gift: Gift,
  coffee: Coffee,
  plane: Plane,
  smartphone: Smartphone,
  "credit-card": CreditCard,
  gamepad: Gamepad2,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  dumbbell: Dumbbell,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  palette: Palette,
  music: Music,
  gem: Gem,
};
const ICON_CHOICES = Object.keys(ICON_MAP);
function CategoryIcon({ name, className }) {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} />;
}
const COLOR_CHOICES = [
  "#3b5fd9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#64748b",
];
const emptyForm = {
  name: "",
  type: "expense",
  icon: ICON_CHOICES[0],
  color: COLOR_CHOICES[0],
  parentCategory: "",
};
export default function Categories() {
  const dispatch = useDispatch();
  const {
    items: categories,
    status,
    customCategoryLimit,
    customCategoryCount,
  } = useSelector((state) => state.categories);
  const [showForm, setShowForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reassignTo, setReassignTo] = useState("");
  const atCustomLimit =
    customCategoryLimit !== null && customCategoryCount >= customCategoryLimit;
  useEffect(() => {
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
  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon || ICON_CHOICES[0],
      color: cat.color || COLOR_CHOICES[0],
      parentCategory: cat.parentCategory || "",
    });
    setShowForm(true);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      parentCategory: form.parentCategory || null,
    };
    if (editingId) {
      const result = await dispatch(
        updateCategory({
          id: editingId,
          payload,
        }),
      );
      if (updateCategory.fulfilled.match(result)) {
        toast.success("Category updated");
        resetForm();
      } else {
        toast.error(result.payload || "Update failed");
      }
    } else {
      const result = await dispatch(createCategory(payload));
      if (createCategory.fulfilled.match(result)) {
        toast.success("Category created");
        resetForm();
      } else {
        toast.error(result.payload || "Failed to create category");
      }
    }
  }
  async function handleDelete(cat) {
    if (cat.isDefault) {
      toast.error("Default categories can't be deleted");
      return;
    }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const result = await dispatch(
      deleteCategory({
        id: cat.id,
      }),
    );
    if (deleteCategory.fulfilled.match(result)) {
      toast.success("Category deleted");
    } else if (String(result.payload).match(/reassignTo/i)) {
      setPendingDelete(cat);
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  async function confirmReassignDelete() {
    if (!reassignTo) {
      toast.error("Choose a category to reassign transactions to");
      return;
    }
    const result = await dispatch(
      deleteCategory({
        id: pendingDelete.id,
        reassignTo,
      }),
    );
    if (deleteCategory.fulfilled.match(result)) {
      toast.success(`Deleted — transactions moved to the replacement category`);
      setPendingDelete(null);
      setReassignTo("");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const parentCandidates = categories.filter(
    (c) => c.type === form.type && c.id !== editingId,
  );
  const reassignCandidates = pendingDelete
    ? categories.filter(
        (c) => c.type === pendingDelete.type && c.id !== pendingDelete.id,
      )
    : [];
  function CategoryGroup({ title, items }) {
    const topLevel = items.filter((c) => !c.parentCategory);
    const childrenOf = (id) => items.filter((c) => c.parentCategory === id);
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {topLevel.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">
            No categories yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-50 dark:divide-gray-700">
            {topLevel.map((cat) => (
              <li key={cat.id}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${cat.color}22`,
                        color: cat.color,
                      }}
                    >
                      <CategoryIcon name={cat.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cat.name}
                    </span>
                    {cat.isDefault && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => startEdit(cat)}
                      className="flex items-center gap-1 text-brand-600 hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!cat.isDefault && (
                      <button
                        onClick={() => handleDelete(cat)}
                        className="flex items-center gap-1 text-red-500 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {childrenOf(cat.id).length > 0 && (
                  <ul className="ml-11 border-l border-gray-100 pl-4 dark:border-gray-700">
                    {childrenOf(cat.id).map((child) => (
                      <li
                        key={child.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: `${child.color}22`,
                              color: child.color,
                            }}
                          >
                            <CategoryIcon
                              name={child.icon}
                              className="h-3.5 w-3.5"
                            />
                          </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {child.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <button
                            onClick={() => startEdit(child)}
                            className="flex items-center gap-1 text-brand-600 hover:underline"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(child)}
                            className="flex items-center gap-1 text-red-500 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Categories
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organize income and spending into categories.
          </p>
        </div>
        <button
          onClick={() => {
            if (atCustomLimit && !showForm) {
              setShowUpgrade(true);
              return;
            }
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add category
            </>
          )}
        </button>
      </div>

      {customCategoryLimit !== null && (
        <div
          className={`mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${atCustomLimit ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
        >
          <span>
            {atCustomLimit
              ? `You've used all ${customCategoryLimit} custom categories on the free plan.`
              : `${customCategoryCount}/${customCategoryLimit} custom categories used (free plan).`}
          </span>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex shrink-0 items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            <Crown className="h-3.5 w-3.5" /> Upgrade
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
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
                disabled={!!editingId}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Parent category (optional)
              </label>
              <select
                name="parentCategory"
                value={form.parentCategory}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              >
                <option value="">None (top-level)</option>
                {parentCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Color
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {COLOR_CHOICES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        color: c,
                      }))
                    }
                    className={`h-7 w-7 rounded-full ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : ""}`}
                    style={{
                      backgroundColor: c,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Icon
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ICON_CHOICES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        icon: name,
                      }))
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-md border dark:border-gray-600 ${form.icon === name ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700"}`}
                  >
                    <CategoryIcon
                      name={name}
                      className="h-4 w-4 text-gray-600 dark:text-gray-300"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editingId ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      )}

      {pendingDelete && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            "{pendingDelete.name}" has existing transactions. Choose a category
            to move them to before deleting.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="">Select category...</option>
              {reassignCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={confirmReassignDelete}
              className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Move & delete
            </button>
            <button
              onClick={() => setPendingDelete(null)}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        <CategoryGroup title="Income" items={incomeCategories} />
        <CategoryGroup title="Expense" items={expenseCategories} />
      </div>

      {categories.length === 0 && status === "succeeded" && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-white py-10 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <Tag className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No categories yet. Create your first one above.
          </p>
        </div>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
