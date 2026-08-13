import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Users, Mail, Trash2, LogOut, Crown } from "lucide-react";
import {
  fetchHouseholds,
  fetchMyInvites,
  createHousehold,
  deleteHousehold,
  leaveHousehold,
  removeHouseholdMember,
  inviteToHousehold,
  acceptHouseholdInvite,
} from "../features/households/householdsSlice";
export default function Households() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    items: households,
    invites,
    status,
  } = useSelector((state) => state.households);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [inviteEmails, setInviteEmails] = useState({});
  const [accepting, setAccepting] = useState(false);
  useEffect(() => {
    dispatch(fetchHouseholds());
    dispatch(fetchMyInvites());
  }, [dispatch]);
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    setAccepting(true);
    dispatch(acceptHouseholdInvite(token))
      .then((result) => {
        if (acceptHouseholdInvite.fulfilled.match(result)) {
          toast.success(result.payload.message);
          dispatch(fetchHouseholds());
        } else {
          toast.error(result.payload || "Failed to accept invite");
        }
      })
      .finally(() => {
        setAccepting(false);
        setSearchParams({});
      });
  }, []);
  async function handleCreate(e) {
    e.preventDefault();
    const result = await dispatch(
      createHousehold({
        name,
      }),
    );
    if (createHousehold.fulfilled.match(result)) {
      toast.success("Household created");
      setName("");
      setShowForm(false);
    } else {
      toast.error(result.payload || "Failed to create household");
    }
  }
  async function handleInvite(householdId) {
    const email = (inviteEmails[householdId] || "").trim();
    if (!email) {
      toast.error("Enter an email address");
      return;
    }
    const result = await dispatch(
      inviteToHousehold({
        id: householdId,
        email,
      }),
    );
    if (inviteToHousehold.fulfilled.match(result)) {
      toast.success(result.payload.message);
      setInviteEmails((m) => ({
        ...m,
        [householdId]: "",
      }));
    } else {
      toast.error(result.payload || "Failed to send invite");
    }
  }
  async function handleDelete(household) {
    if (
      !confirm(
        `Delete "${household.name}"? This removes its shared budgets too.`,
      )
    )
      return;
    const result = await dispatch(deleteHousehold(household.id));
    if (deleteHousehold.fulfilled.match(result)) {
      toast.success("Household deleted");
    } else {
      toast.error(result.payload || "Failed to delete household");
    }
  }
  async function handleLeave(household) {
    if (!confirm(`Leave "${household.name}"?`)) return;
    const result = await dispatch(leaveHousehold(household.id));
    if (leaveHousehold.fulfilled.match(result)) {
      toast.success("Left household");
    } else {
      toast.error(result.payload || "Failed to leave household");
    }
  }
  async function handleRemoveMember(household, member) {
    if (!confirm(`Remove ${member.name} from "${household.name}"?`)) return;
    const result = await dispatch(
      removeHouseholdMember({
        id: household.id,
        userId: member.id,
      }),
    );
    if (!removeHouseholdMember.fulfilled.match(result)) {
      toast.error(result.payload || "Failed to remove member");
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Households
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Share budgets with family or roommates — invite them to a household,
            then create a shared budget from the Budgets page.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4" /> New household
            </>
          )}
        </button>
      </div>

      {accepting && (
        <div className="mt-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          Accepting invite...
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 flex items-end gap-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Household name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Smith Family"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Create
          </button>
        </form>
      )}

      {invites.length > 0 && (
        <div className="mt-6 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Pending invites
          </p>
          <ul className="mt-2 space-y-1">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="text-sm text-amber-800 dark:text-amber-300"
              >
                {inv.household.ownerName} invited you to "{inv.household.name}"
                — open the link in that invite email to accept.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {status === "loading" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {status === "succeeded" && households.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-10 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
            <Users className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No households yet. Create one to start sharing budgets.
            </p>
          </div>
        )}
        {households.map((h) => (
          <div
            key={h.id}
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {h.name}
                </h2>
                {h.isOwner && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <Crown className="h-3 w-3" /> Owner
                  </span>
                )}
              </div>
              {h.isOwner ? (
                <button
                  onClick={() => handleDelete(h)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : (
                <button
                  onClick={() => handleLeave(h)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:underline dark:text-gray-400"
                >
                  <LogOut className="h-3.5 w-3.5" /> Leave
                </button>
              )}
            </div>

            <ul className="mt-3 space-y-1.5">
              <li className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>{h.owner.name} (owner)</span>
              </li>
              {h.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                >
                  <span>{m.name}</span>
                  {h.isOwner && (
                    <button
                      onClick={() => handleRemoveMember(h, m)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
              {h.members.length === 0 && (
                <li className="text-xs text-gray-400 dark:text-gray-500">
                  No other members yet.
                </li>
              )}
            </ul>

            {h.isOwner && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Invite by email"
                  value={inviteEmails[h.id] || ""}
                  onChange={(e) =>
                    setInviteEmails((m) => ({
                      ...m,
                      [h.id]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <button
                  onClick={() => handleInvite(h.id)}
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <Mail className="h-3.5 w-3.5" /> Invite
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
