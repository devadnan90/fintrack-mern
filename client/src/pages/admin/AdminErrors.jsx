import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Server,
  Monitor,
} from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
const FILTERS = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "server",
    label: "Server",
  },
  {
    id: "client",
    label: "Client",
  },
];
export default function AdminErrors() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  function load() {
    setLoading(true);
    const params =
      filter === "all"
        ? {}
        : {
            source: filter,
          };
    adminAPI
      .listErrorLogs(params)
      .then(setErrors)
      .catch(() => toast.error("Failed to load error log"))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Errors</h1>
          <p className="mt-1 text-sm text-gray-600">
            Server exceptions and reported client-side errors, newest first.
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

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : errors.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 text-center text-sm text-gray-500">
            No errors logged. Good sign.
          </p>
        ) : (
          errors.map((e) => {
            const expanded = expandedId === e.id;
            return (
              <div
                key={e.id}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    )}
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${e.source === "server" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}
                    >
                      {e.source === "server" ? (
                        <Server className="h-3 w-3" />
                      ) : (
                        <Monitor className="h-3 w-3" />
                      )}
                      {e.source}
                    </span>
                    <span className="truncate text-sm text-gray-900">
                      {e.message}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-gray-200 p-4 text-xs">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {e.statusCode && (
                        <div>
                          <dt className="text-gray-500">Status</dt>
                          <dd className="text-gray-800">{e.statusCode}</dd>
                        </div>
                      )}
                      {e.method && (
                        <div>
                          <dt className="text-gray-500">Method</dt>
                          <dd className="text-gray-800">{e.method}</dd>
                        </div>
                      )}
                      <div className="col-span-2">
                        <dt className="text-gray-500">Path</dt>
                        <dd className="truncate text-gray-800">
                          {e.path || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">User</dt>
                        <dd className="text-gray-800">
                          {e.user?.email || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">IP</dt>
                        <dd className="text-gray-800">{e.ip || "—"}</dd>
                      </div>
                    </dl>
                    {e.stack && (
                      <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-gray-50 p-3 text-gray-600">
                        {e.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
