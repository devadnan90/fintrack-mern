import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
export default function AdminWebhooks() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  function load() {
    setLoading(true);
    adminAPI
      .listWebhookEvents()
      .then(setEvents)
      .catch(() => toast.error("Failed to load webhook events"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every Razorpay webhook call received, newest first. Add the endpoint
            in Razorpay Dashboard → Settings → Webhooks:{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
              /api/webhooks/razorpay
            </code>
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : events.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-500">
            No webhook calls received yet. Once RAZORPAY_WEBHOOK_SECRET is set
            and the endpoint is added in the Razorpay Dashboard, events will
            show up here.
          </p>
        ) : (
          events.map((e) => {
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
                    {e.signatureValid ? (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <span className="truncate text-sm font-medium text-white">
                      {e.eventType}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-slate-800 p-4">
                    <p
                      className={`text-xs font-semibold ${e.signatureValid ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {e.signatureValid
                        ? "Signature verified"
                        : "Signature NOT verified — check RAZORPAY_WEBHOOK_SECRET"}
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-300">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
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
