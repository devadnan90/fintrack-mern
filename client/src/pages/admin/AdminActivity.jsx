import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Monitor, Smartphone, Tablet, MapPin } from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
const FILTERS = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "true",
    label: "Successful",
  },
  {
    id: "false",
    label: "Failed",
  },
];
function DeviceIcon({ type }) {
  if (type === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (type === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}
export default function AdminActivity() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  function load() {
    setLoading(true);
    const params =
      filter === "all"
        ? {}
        : {
            success: filter,
          };
    adminAPI
      .listLoginActivity(params)
      .then(setEntries)
      .catch(() => toast.error("Failed to load login activity"))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Login activity</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every login attempt — IP, device, and region, newest first.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-900 p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filter === f.id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Method
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Result
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                IP
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Device
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                Region
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">
                When
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No activity yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-900">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {e.user?.name || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.user?.email || e.email || "unknown"}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-300">
                    {e.method}
                  </td>
                  <td className="px-4 py-3">
                    {e.success ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                        Success
                      </span>
                    ) : (
                      <span
                        title={e.reason || ""}
                        className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300"
                      >
                        Failed{e.reason ? `: ${e.reason}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {e.ip || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <DeviceIcon type={e.deviceType} />
                      {e.browser} / {e.os}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {e.city || e.region || e.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {[e.city, e.region, e.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
