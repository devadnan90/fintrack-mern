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
          <h1 className="text-xl font-semibold text-gray-900">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-600">
            Every Razorpay webhook call received, newest first. Add the endpoint
            in Razorpay Dashboard → Settings → Webhooks:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-gray-700">
              /api/webhooks/razorpay
            </code>
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white shadow-sm p-6 text-center text-sm text-gray-500">
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
                    {e.signatureValid ? (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-green-700" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span className="truncate text-sm font-medium text-gray-900">
                      {e.eventType}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-gray-200 p-4">
                    <p
                      className={`text-xs font-semibold ${e.signatureValid ? "text-green-700" : "text-red-600"}`}
                    >
                      {e.signatureValid
                        ? "Signature verified"
                        : "Signature NOT verified — check RAZORPAY_WEBHOOK_SECRET"}
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
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
