import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users2,
  CreditCard,
  LogOut,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Webhook,
} from "lucide-react";
import { adminAPI } from "../../features/admin/adminAPI";
import AdminOverview from "./AdminOverview";
import AdminUsers from "./AdminUsers";
import AdminRazorpay from "./AdminRazorpay";
import AdminActivity from "./AdminActivity";
import AdminErrors from "./AdminErrors";
import AdminWebhooks from "./AdminWebhooks";
const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "users",
    label: "Users",
    icon: Users2,
  },
  {
    id: "razorpay",
    label: "Razorpay",
    icon: CreditCard,
  },
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
  },
  {
    id: "errors",
    label: "Errors",
    icon: AlertTriangle,
  },
  {
    id: "webhooks",
    label: "Webhooks",
    icon: Webhook,
  },
];
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  function handleLogout() {
    adminAPI.logout();
    navigate("/admin/login");
  }
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <span className="text-[15px] font-semibold text-gray-900">
            FinTrack Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-6 lg:p-8">
        {tab === "overview" && <AdminOverview />}
        {tab === "users" && <AdminUsers />}
        {tab === "razorpay" && <AdminRazorpay />}
        {tab === "activity" && <AdminActivity />}
        {tab === "errors" && <AdminErrors />}
        {tab === "webhooks" && <AdminWebhooks />}
      </main>
    </div>
  );
}
