import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Ban, CheckCircle2, Crown, X, RefreshCw } from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
import { formatMoney, formatDate } from "../../utils/format";
function money(paise, currency = "INR") {
  return formatMoney((paise || 0) / 100, currency);
}
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  function load() {
    setLoading(true);
    adminAPI
      .listUsers()
      .then(setUsers)
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function handleToggleBan(user) {
    setBusyId(user.id);
    try {
      if (user.banned) {
        await adminAPI.unbanUser(user.id);
        toast.success(`${user.email} unbanned`);
      } else {
        await adminAPI.banUser(user.id);
        toast.success(`${user.email} banned`);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }
  async function openDetail(user) {
    setDetailLoading(true);
    setDetail({
      id: user.id,
    });
    try {
      const data = await adminAPI.getUserDetail(user.id);
      setDetail(data);
    } catch {
      toast.error("Failed to load user detail");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            {users.length} account(s). Click a row for purchase history.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Premium
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Lifetime spend
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Joined
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openDetail(u)}
                  className="cursor-pointer hover:bg-slate-900"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.premium.isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Crown className="h-3.5 w-3.5" /> {u.premium.plan}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {money(u.lifetimeSpend.totalPaise)}{" "}
                    <span className="text-xs text-slate-500">
                      ({u.lifetimeSpend.orderCount})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBan(u);
                      }}
                      disabled={busyId === u.id}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${u.banned ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-red-600 text-white hover:bg-red-500"}`}
                    >
                      {u.banned ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Ban className="h-3.5 w-3.5" />
                      )}
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-white">Purchase history</h2>
              <button
                onClick={() => setDetail(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading...</p>
            ) : detail.user ? (
              <>
                <p className="mt-3 text-sm text-slate-300">
                  {detail.user.name} · {detail.user.email}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {detail.user.premium.isActive
                    ? `Premium (${detail.user.premium.plan}) until ${formatDate(detail.user.premium.expiresAt)}`
                    : "Not currently premium"}
                </p>

                <div className="mt-4 space-y-2">
                  {detail.purchases.length === 0 ? (
                    <p className="text-sm text-slate-500">No purchases yet.</p>
                  ) : (
                    detail.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white capitalize">
                            {p.plan}
                          </span>
                          <span className="text-slate-300">
                            {money(p.amount, p.currency)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDate(p.createdAt)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${p.status === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-600">
                          order {p.orderId}{" "}
                          {p.paymentId ? `· payment ${p.paymentId}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Failed to load.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
