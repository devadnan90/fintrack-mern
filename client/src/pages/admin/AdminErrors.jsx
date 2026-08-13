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
          <h1 className="text-xl font-bold text-white">Errors</h1>
          <p className="mt-1 text-sm text-slate-400">
            Server exceptions and reported client-side errors, newest first.
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

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : errors.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-500">
            No errors logged. Good sign.
          </p>
        ) : (
          errors.map((e) => {
            const expanded = expandedId === e.id;
            return (
              <div
                key={e.id}
                className="rounded-xl border border-slate-800 bg-slate-900"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${e.source === "server" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}
                    >
                      {e.source === "server" ? (
                        <Server className="h-3 w-3" />
                      ) : (
                        <Monitor className="h-3 w-3" />
                      )}
                      {e.source}
                    </span>
                    <span className="truncate text-sm text-white">
                      {e.message}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-slate-800 p-4 text-xs">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {e.statusCode && (
                        <div>
                          <dt className="text-slate-500">Status</dt>
                          <dd className="text-slate-200">{e.statusCode}</dd>
                        </div>
                      )}
                      {e.method && (
                        <div>
                          <dt className="text-slate-500">Method</dt>
                          <dd className="text-slate-200">{e.method}</dd>
                        </div>
                      )}
                      <div className="col-span-2">
                        <dt className="text-slate-500">Path</dt>
                        <dd className="truncate text-slate-200">
                          {e.path || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">User</dt>
                        <dd className="text-slate-200">
                          {e.user?.email || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">IP</dt>
                        <dd className="text-slate-200">{e.ip || "—"}</dd>
                      </div>
                    </dl>
                    {e.stack && (
                      <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-slate-950 p-3 text-slate-400">
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
