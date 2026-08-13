import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Plus, Target, Trash2, PartyPopper, Pencil } from "lucide-react";
import {
  fetchGoals,
  createGoal,
  updateGoal,
  contributeToGoal,
  deleteGoal,
} from "../features/goals/goalsSlice";
import { formatMoney, formatDate } from "../utils/format";
const emptyForm = {
  name: "",
  targetAmount: "",
  targetDate: "",
};
export default function Goals() {
  const dispatch = useDispatch();
  const { items: goals, status } = useSelector((state) => state.goals);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [contributeId, setContributeId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  useEffect(() => {
    dispatch(fetchGoals());
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
    const result = await dispatch(
      createGoal({
        ...form,
        targetAmount: Number(form.targetAmount),
      }),
    );
    if (createGoal.fulfilled.match(result)) {
      toast.success("Goal created");
      resetForm();
    } else {
      toast.error(result.payload || "Failed to create goal");
    }
  }
  async function handleContribute(goal) {
    const amount = Number(contributeAmount);
    if (!amount) return;
    const result = await dispatch(
      contributeToGoal({
        id: goal.id,
        amount,
      }),
    );
    if (contributeToGoal.fulfilled.match(result)) {
      if (result.payload.justAchieved) {
        toast.success(`🎉 You hit your "${goal.name}" goal!`);
      } else {
        toast.success("Contribution logged");
      }
      setContributeId(null);
      setContributeAmount("");
    } else {
      toast.error(result.payload || "Failed to log contribution");
    }
  }
  function startEdit(goal) {
    setContributeId(null);
    setEditId(goal.id);
    setEditForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    });
  }
  function handleEditChange(e) {
    setEditForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handleEditSubmit(e, goal) {
    e.preventDefault();
    const result = await dispatch(
      updateGoal({
        id: goal.id,
        payload: {
          ...editForm,
          targetAmount: Number(editForm.targetAmount),
        },
      }),
    );
    if (updateGoal.fulfilled.match(result)) {
      toast.success("Goal updated");
      setEditId(null);
    } else {
      toast.error(result.payload || "Failed to update goal");
    }
  }
  async function handleDelete(goal) {
    if (!confirm(`Delete goal "${goal.name}"?`)) return;
    const result = await dispatch(deleteGoal(goal.id));
    if (deleteGoal.fulfilled.match(result)) {
      toast.success("Goal deleted");
    } else {
      toast.error(result.payload || "Delete failed");
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Goals
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Save toward what matters.
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
              <Plus className="h-4 w-4" /> New goal
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
              placeholder="Emergency fund"
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target amount
            </label>
            <input
              name="targetAmount"
              type="number"
              step="0.01"
              required
              value={form.targetAmount}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target date (optional)
            </label>
            <input
              name="targetDate"
              type="date"
              value={form.targetDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create goal
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {status === "succeeded" && goals.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No goals yet. Create one above.
          </p>
        )}
        {goals.map((g) => (
          <div
            key={g.id}
            className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${g.achieved ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}
                >
                  {g.achieved ? (
                    <PartyPopper className="h-5 w-5" />
                  ) : (
                    <Target className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {g.name}
                  </p>
                  {g.targetDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      by {formatDate(g.targetDate, dateFormat)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    editId === g.id ? setEditId(null) : startEdit(g)
                  }
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(g)}
                  className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>

            {editId === g.id ? (
              <form
                onSubmit={(e) => handleEditSubmit(e, g)}
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <input
                  name="name"
                  required
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm sm:col-span-3"
                />
                <input
                  name="targetAmount"
                  type="number"
                  step="0.01"
                  required
                  value={editForm.targetAmount}
                  onChange={handleEditChange}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                />
                <input
                  name="targetDate"
                  type="date"
                  value={editForm.targetDate}
                  onChange={handleEditChange}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700"
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
                    {formatMoney(g.currentAmount, g.currency)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    of {formatMoney(g.targetAmount, g.currency)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full ${g.achieved ? "bg-green-500" : "bg-brand-600"}`}
                    style={{
                      width: `${g.percentComplete}%`,
                    }}
                  />
                </div>

                {contributeId === g.id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      placeholder="Amount"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleContribute(g)}
                      className="rounded-md bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setContributeId(null)}
                      className="text-sm text-gray-500 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setContributeId(g.id)}
                    className="mt-3 text-xs font-medium text-brand-600 hover:underline"
                  >
                    Log contribution
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
