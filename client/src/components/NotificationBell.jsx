import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  Clock,
  PiggyBank,
  PartyPopper,
  CheckCircle2,
  Check,
  X,
  TrendingUp,
} from "lucide-react";
import { notificationsAPI } from "../features/notifications/notificationsAPI";
import { formatDate } from "../utils/format";
const TYPE_META = {
  "bill-overdue": {
    icon: AlertTriangle,
    className: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
  },
  "bill-upcoming": {
    icon: Clock,
    className:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "budget-exceeded": {
    icon: PiggyBank,
    className: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
  },
  "budget-approaching": {
    icon: PiggyBank,
    className:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "goal-achieved": {
    icon: PartyPopper,
    className:
      "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400",
  },
  "spending-anomaly": {
    icon: TrendingUp,
    className:
      "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  "large-transaction": {
    icon: TrendingUp,
    className:
      "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);
  const navigate = useNavigate();
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  async function load() {
    try {
      const data = await notificationsAPI.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }
  async function handleSelect(n) {
    setOpen(false);
    if (!n.read) {
      setNotifications((list) =>
        list.map((x) =>
          x.id === n.id
            ? {
                ...x,
                read: true,
              }
            : x,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationsAPI.markRead(n.id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }
  async function handleMarkAllRead(e) {
    e.stopPropagation();
    setNotifications((list) =>
      list.map((n) => ({
        ...n,
        read: true,
      })),
    );
    setUnreadCount(0);
    await notificationsAPI.markAllRead().catch(() => {});
  }
  async function handleDismiss(e, id) {
    e.stopPropagation();
    const wasUnread = notifications.find((n) => n.id === id)?.read === false;
    setNotifications((list) => list.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    await notificationsAPI.dismiss(id).catch(() => {});
  }
  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-gray-500 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                {notifications.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META["bill-upcoming"];
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleSelect(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.read ? "bg-blue-50/40 dark:bg-blue-500/5" : ""}`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            {n.message}
                          </span>
                          <span className="block text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(n.createdAt, dateFormat)}
                          </span>
                        </span>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleDismiss(e, n.id)}
                          className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
