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
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            {users.length} account(s). Click a row for purchase history.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Premium
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Lifetime spend
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Joined
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openDetail(u)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.premium.isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Crown className="h-3.5 w-3.5" /> {u.premium.plan}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {money(u.lifetimeSpend.totalPaise)}{" "}
                    <span className="text-xs text-gray-500">
                      ({u.lifetimeSpend.orderCount})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                        Banned
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
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
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${u.banned ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-red-600 text-white hover:bg-red-700"}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Purchase history</h2>
              <button
                onClick={() => setDetail(null)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            ) : detail.user ? (
              <>
                <p className="mt-3 text-sm text-gray-700">
                  {detail.user.name} · {detail.user.email}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {detail.user.premium.isActive
                    ? `Premium (${detail.user.premium.plan}) until ${formatDate(detail.user.premium.expiresAt)}`
                    : "Not currently premium"}
                </p>

                <div className="mt-4 space-y-2">
                  {detail.purchases.length === 0 ? (
                    <p className="text-sm text-gray-500">No purchases yet.</p>
                  ) : (
                    detail.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 capitalize">
                            {p.plan}
                          </span>
                          <span className="text-gray-700">
                            {money(p.amount, p.currency)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(p.createdAt)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${p.status === "verified" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-gray-400">
                          order {p.orderId}{" "}
                          {p.paymentId ? `· payment ${p.paymentId}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Failed to load.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
