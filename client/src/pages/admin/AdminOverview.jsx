import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Server, Database, Activity } from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
function StatCard({ label, value, hint, ok }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${ok === false ? "text-red-400" : ok === true ? "text-emerald-400" : "text-white"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
export default function AdminOverview() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    adminAPI
      .getHealth()
      .then(setHealth)
      .catch(() => toast.error("Failed to load server health"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);
  async function handleReconnect() {
    setReconnecting(true);
    try {
      await adminAPI.reconnectDatabase();
      toast.success("Database reconnected");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reconnect failed");
    } finally {
      setReconnecting(false);
    }
  }
  const dbConnected = health?.database?.state === "connected";
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Server overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live health of the API server and database connection.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading && !health ? (
        <p className="mt-6 text-sm text-slate-500">Loading...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Server"
              value="Up"
              ok
              hint={`Node ${health.server.nodeVersion} · ${health.server.env}`}
            />
            <StatCard
              label="Database"
              value={health.database.state}
              ok={dbConnected}
              hint={
                health.database.host
                  ? `${health.database.host}/${health.database.name}`
                  : "Not connected"
              }
            />
            <StatCard
              label="DB ping"
              value={
                health.database.pingMs != null
                  ? `${health.database.pingMs} ms`
                  : "—"
              }
              hint={health.database.pingError || "Round-trip to MongoDB"}
            />
            <StatCard
              label="Uptime"
              value={`${Math.floor(health.server.uptimeSeconds / 60)} min`}
              hint="Since last restart"
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-white">
                  Connection control
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dbConnected ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}
              >
                {dbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Force a fresh reconnect to MongoDB if the ping above is failing or
              slow. This closes the existing connection (if any) and
              re-establishes it using the server's configured MONGO_URI.
            </p>
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mt-4 flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              <Database className="h-4 w-4" />{" "}
              {reconnecting ? "Reconnecting..." : "Disconnect & reconnect"}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white">Process</h2>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Platform</dt>
                <dd className="text-slate-200">{health.server.platform}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Memory (RSS)</dt>
                <dd className="text-slate-200">
                  {health.server.memory.rssMb} MB
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Free memory</dt>
                <dd className="text-slate-200">
                  {health.server.memory.freeMb} / {health.server.memory.totalMb}{" "}
                  MB
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
