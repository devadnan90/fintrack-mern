import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CreditCard,
  Zap,
  ListOrdered,
  Search,
  Receipt,
  Wallet,
  Lock,
  Undo2,
  History,
  BarChart3,
} from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
import { formatMoney, formatDate } from "../../utils/format";
function money(paise, currency = "INR") {
  return formatMoney((paise || 0) / 100, currency);
}
function ResultBlock({ result, error }) {
  if (error)
    return (
      <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-red-500/10 p-3 text-xs text-red-300">
        {error}
      </pre>
    );
  if (result === undefined) return null;
  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-300">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
function ToolCard({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function inputClass() {
  return "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
}
function buttonClass() {
  return "rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60";
}
function useTool(fn) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState(null);
  async function run(...args) {
    setLoading(true);
    setError(null);
    try {
      const data = await fn(...args);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }
  return {
    run,
    loading,
    result,
    error,
  };
}
export default function AdminRazorpay() {
  const [config, setConfig] = useState(null);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const testConn = useTool(() => adminAPI.razorpay.testConnection());
  const [orderIdInput, setOrderIdInput] = useState("");
  const fetchOrderTool = useTool((id) => adminAPI.razorpay.fetchOrder(id));
  const [orderPaymentsInput, setOrderPaymentsInput] = useState("");
  const fetchOrderPaymentsTool = useTool((id) =>
    adminAPI.razorpay.fetchOrderPayments(id),
  );
  const [paymentIdInput, setPaymentIdInput] = useState("");
  const fetchPaymentTool = useTool((id) => adminAPI.razorpay.fetchPayment(id));
  const [captureForm, setCaptureForm] = useState({
    paymentId: "",
    amount: "",
    currency: "INR",
  });
  const captureTool = useTool((paymentId, amount, currency) =>
    adminAPI.razorpay.capturePayment(paymentId, Number(amount), currency),
  );
  const [refundForm, setRefundForm] = useState({
    paymentId: "",
    amount: "",
    notes: "",
  });
  const refundTool = useTool((paymentId, amount, notes) =>
    adminAPI.razorpay.refundPayment(
      paymentId,
      amount ? Number(amount) : undefined,
      notes || undefined,
    ),
  );
  const [refundsPaymentId, setRefundsPaymentId] = useState("");
  const listRefundsTool = useTool((id) => adminAPI.razorpay.listRefunds(id));
  useEffect(() => {
    adminAPI.razorpay
      .getConfig()
      .then(setConfig)
      .catch(() => toast.error("Failed to load Razorpay config"));
    adminAPI.razorpay
      .getRevenueSummary()
      .then(setSummary)
      .catch(() => toast.error("Failed to load revenue summary"));
    adminAPI.razorpay
      .listOrders()
      .then(setOrders)
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setOrdersLoading(false));
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Razorpay tools</h1>
      <p className="mt-1 text-sm text-slate-400">
        {config
          ? config.enabled
            ? `Live · key ${config.keyId}`
            : "Not configured on this server"
          : "Loading..."}
      </p>

      {summary && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total revenue
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {money(summary.totalPaise, summary.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Verified orders
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {summary.totalOrders}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              By plan
            </p>
            <p className="mt-1 space-x-2 text-sm text-slate-300">
              {summary.byPlan.map((p) => (
                <span key={p.plan} className="capitalize">
                  {p.plan}: {p.orderCount}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ToolCard
          icon={CreditCard}
          title="1. Plan config"
          description="Currently configured plan tiers and pricing."
        >
          {config?.plans ? (
            <div className="space-y-1 text-sm text-slate-300">
              {config.plans.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span className="capitalize">{p.id}</span>
                  <span>
                    {money(p.amount, p.currency)} / {p.days}d
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading...</p>
          )}
        </ToolCard>

        <ToolCard
          icon={Zap}
          title="2. Test connection"
          description="Confirm the configured API key pair is valid and reachable."
        >
          <button
            onClick={() => testConn.run()}
            disabled={testConn.loading}
            className={buttonClass()}
          >
            {testConn.loading ? "Testing..." : "Run test"}
          </button>
          <ResultBlock result={testConn.result} error={testConn.error} />
        </ToolCard>

        <ToolCard
          icon={ListOrdered}
          title="3. Orders (this app's DB)"
          description="Every order FinTrack has created, newest first."
        >
          {ordersLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-white">
                      {o.user?.email || "—"}
                    </span>
                    <span className="text-slate-400">
                      {money(o.amount, o.currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500">
                    <span className="capitalize">
                      {o.plan} · {o.status}
                    </span>
                    <span>{formatDate(o.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ToolCard>

        <ToolCard
          icon={Search}
          title="4. Fetch order"
          description="Look up a single order live from Razorpay by its order id."
        >
          <div className="flex gap-2">
            <input
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              placeholder="order_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <button
              onClick={() => fetchOrderTool.run(orderIdInput)}
              disabled={fetchOrderTool.loading || !orderIdInput}
              className={buttonClass()}
            >
              Fetch
            </button>
          </div>
          <ResultBlock
            result={fetchOrderTool.result}
            error={fetchOrderTool.error}
          />
        </ToolCard>

        <ToolCard
          icon={Receipt}
          title="5. Payments for an order"
          description="Every payment attempt (including failed ones) against an order."
        >
          <div className="flex gap-2">
            <input
              value={orderPaymentsInput}
              onChange={(e) => setOrderPaymentsInput(e.target.value)}
              placeholder="order_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <button
              onClick={() => fetchOrderPaymentsTool.run(orderPaymentsInput)}
              disabled={fetchOrderPaymentsTool.loading || !orderPaymentsInput}
              className={buttonClass()}
            >
              Fetch
            </button>
          </div>
          <ResultBlock
            result={fetchOrderPaymentsTool.result}
            error={fetchOrderPaymentsTool.error}
          />
        </ToolCard>

        <ToolCard
          icon={Wallet}
          title="6. Fetch payment"
          description="Look up a single payment live from Razorpay by its payment id."
        >
          <div className="flex gap-2">
            <input
              value={paymentIdInput}
              onChange={(e) => setPaymentIdInput(e.target.value)}
              placeholder="pay_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <button
              onClick={() => fetchPaymentTool.run(paymentIdInput)}
              disabled={fetchPaymentTool.loading || !paymentIdInput}
              className={buttonClass()}
            >
              Fetch
            </button>
          </div>
          <ResultBlock
            result={fetchPaymentTool.result}
            error={fetchPaymentTool.error}
          />
        </ToolCard>

        <ToolCard
          icon={Lock}
          title="7. Capture payment"
          description="Capture a payment that's only authorized, not yet captured."
        >
          <div className="space-y-2">
            <input
              value={captureForm.paymentId}
              onChange={(e) =>
                setCaptureForm((f) => ({
                  ...f,
                  paymentId: e.target.value,
                }))
              }
              placeholder="pay_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <div className="flex gap-2">
              <input
                value={captureForm.amount}
                onChange={(e) =>
                  setCaptureForm((f) => ({
                    ...f,
                    amount: e.target.value,
                  }))
                }
                placeholder="Amount (paise)"
                className={inputClass()}
              />
              <input
                value={captureForm.currency}
                onChange={(e) =>
                  setCaptureForm((f) => ({
                    ...f,
                    currency: e.target.value,
                  }))
                }
                placeholder="Currency"
                className={inputClass()}
              />
            </div>
            <button
              onClick={() =>
                captureTool.run(
                  captureForm.paymentId,
                  captureForm.amount,
                  captureForm.currency,
                )
              }
              disabled={
                captureTool.loading ||
                !captureForm.paymentId ||
                !captureForm.amount
              }
              className={buttonClass()}
            >
              Capture
            </button>
          </div>
          <ResultBlock result={captureTool.result} error={captureTool.error} />
        </ToolCard>

        <ToolCard
          icon={Undo2}
          title="8. Refund payment"
          description="Full or partial refund (leave amount blank for a full refund)."
        >
          <div className="space-y-2">
            <input
              value={refundForm.paymentId}
              onChange={(e) =>
                setRefundForm((f) => ({
                  ...f,
                  paymentId: e.target.value,
                }))
              }
              placeholder="pay_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <div className="flex gap-2">
              <input
                value={refundForm.amount}
                onChange={(e) =>
                  setRefundForm((f) => ({
                    ...f,
                    amount: e.target.value,
                  }))
                }
                placeholder="Amount (paise, optional)"
                className={inputClass()}
              />
              <input
                value={refundForm.notes}
                onChange={(e) =>
                  setRefundForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                placeholder="Reason (optional)"
                className={inputClass()}
              />
            </div>
            <button
              onClick={() => {
                if (
                  !confirm(
                    "Refund this payment? This moves real money back to the customer.",
                  )
                )
                  return;
                refundTool.run(
                  refundForm.paymentId,
                  refundForm.amount,
                  refundForm.notes,
                );
              }}
              disabled={refundTool.loading || !refundForm.paymentId}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              Refund
            </button>
          </div>
          <ResultBlock result={refundTool.result} error={refundTool.error} />
        </ToolCard>

        <ToolCard
          icon={History}
          title="9. List refunds"
          description="Every refund already issued against a payment."
        >
          <div className="flex gap-2">
            <input
              value={refundsPaymentId}
              onChange={(e) => setRefundsPaymentId(e.target.value)}
              placeholder="pay_XXXXXXXXXXXX"
              className={inputClass()}
            />
            <button
              onClick={() => listRefundsTool.run(refundsPaymentId)}
              disabled={listRefundsTool.loading || !refundsPaymentId}
              className={buttonClass()}
            >
              List
            </button>
          </div>
          <ResultBlock
            result={listRefundsTool.result}
            error={listRefundsTool.error}
          />
        </ToolCard>

        <ToolCard
          icon={BarChart3}
          title="10. Revenue summary"
          description="Verified revenue grouped by plan, computed from this app's records."
        >
          {summary ? (
            <ResultBlock result={summary} />
          ) : (
            <p className="text-sm text-slate-500">Loading...</p>
          )}
        </ToolCard>
      </div>
    </div>
  );
}
