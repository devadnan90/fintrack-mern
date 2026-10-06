import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Server, Database, Activity } from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
function StatCard({ label, value, hint, ok }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
      <p className="text-sm font-medium text-gray-600">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold ${ok === false ? "text-red-600" : ok === true ? "text-green-700" : "text-gray-900"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
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
          <h1 className="text-xl font-semibold text-gray-900">Server overview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live health of the API server and database connection.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading && !health ? (
        <p className="mt-6 text-sm text-gray-500">Loading...</p>
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

          <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-gray-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Connection control
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dbConnected ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {dbConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Force a fresh reconnect to MongoDB if the ping above is failing or
              slow. This closes the existing connection (if any) and
              re-establishes it using the server's configured MONGO_URI.
            </p>
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="mt-4 flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Database className="h-4 w-4" />{" "}
              {reconnecting ? "Reconnecting..." : "Disconnect & reconnect"}
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-900">Process</h2>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Platform</dt>
                <dd className="text-gray-800">{health.server.platform}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Memory (RSS)</dt>
                <dd className="text-gray-800">
                  {health.server.memory.rssMb} MB
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Free memory</dt>
                <dd className="text-gray-800">
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
