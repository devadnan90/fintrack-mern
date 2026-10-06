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
          <h1 className="text-xl font-semibold text-gray-900">Login activity</h1>
          <p className="mt-1 text-sm text-gray-600">
            Every login attempt — IP, device, and region, newest first.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-white p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filter === f.id ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:text-gray-900"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Method
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Result
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                IP
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Device
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Region
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                When
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No activity yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {e.user?.name || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {e.user?.email || e.email || "unknown"}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {e.method}
                  </td>
                  <td className="px-4 py-3">
                    {e.success ? (
                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                        Success
                      </span>
                    ) : (
                      <span
                        title={e.reason || ""}
                        className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        Failed{e.reason ? `: ${e.reason}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {e.ip || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <DeviceIcon type={e.deviceType} />
                      {e.browser} / {e.os}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {e.city || e.region || e.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-500" />
                        {[e.city, e.region, e.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
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
