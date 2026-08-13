import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Crown,
  ChevronDown,
  LogOut,
  WalletCards,
  X,
  Sun,
  Moon,
  Search,
  Check,
  Lock,
} from "lucide-react";
import { logoutUser } from "../../features/auth/authSlice";
import useTheme from "../../utils/useTheme";
import { formatDate } from "../../utils/format";
import { navLinks as links } from "../../config/navLinks";
import UpgradeModal from "../UpgradeModal";
function initials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
export default function Sidebar({ open = false, onClose = () => {} }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const { theme, toggleTheme } = useTheme();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isPremium = Boolean(user?.premium?.isActive);
  async function handleLogout() {
    await dispatch(logoutUser());
    toast.success(t("nav.loggedOut"));
    navigate("/login");
  }
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 transform flex-col bg-gradient-to-b from-brand-600 to-brand-700 text-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <WalletCards className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">FinTrack</span>
          </span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-command-palette"))
            }
            className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/15 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">{t("nav.search")}</span>
            <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/50">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const locked = link.premium && !isPremium;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-white text-brand-700 shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`
                }
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                <span className="flex-1">{t(link.labelKey)}</span>
                {locked && (
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-amber-300"
                    strokeWidth={2.5}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-medium text-white/80">
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {theme === "dark" ? t("nav.darkMode") : t("nav.lightMode")}
          </span>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === "dark"}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-amber-400" : "bg-white/20"}`}
          >
            <span
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{
                transform:
                  theme === "dark" ? "translateX(20px)" : "translateX(0px)",
              }}
            />
          </button>
        </div>

        <div
          className={`mx-4 mb-4 rounded-xl p-4 ${isPremium ? "bg-gradient-to-br from-amber-400/20 to-amber-500/5 ring-1 ring-amber-300/40" : "bg-white/10"}`}
        >
          <Crown className="h-6 w-6 text-amber-300" />
          {isPremium ? (
            <>
              <p className="mt-2 text-sm font-semibold">
                {t("nav.premiumTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {t("nav.premiumBody")}
              </p>
              {user?.premium?.expiresAt && (
                <p className="mt-2 text-xs font-medium text-amber-200">
                  {t("nav.premiumUntil", {
                    date: formatDate(user.premium.expiresAt, user?.dateFormat),
                  })}
                </p>
              )}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="mt-3 w-full rounded-lg border border-amber-300/40 py-2 text-sm font-semibold text-amber-100 hover:bg-white/10"
              >
                {t("nav.renewButton")}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold">
                {t("nav.upgradeTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                {t("nav.upgradeBody")}
              </p>
              <ul className="mt-3 space-y-1.5">
                {t("nav.upgradeFeatures", {
                  returnObjects: true,
                }).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-white/80"
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"
                      strokeWidth={2.5}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="mt-3 w-full rounded-lg bg-white py-2 text-sm font-semibold text-brand-700 hover:bg-white/90"
              >
                {t("nav.upgradeButton")}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isPremium ? "bg-amber-400/20 ring-2 ring-amber-300" : "bg-white/15"}`}
          >
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <span className="truncate">{user?.name || t("nav.account")}</span>
              {isPremium && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                  <Crown className="h-2.5 w-2.5" /> {t("nav.premiumBadge")}
                </span>
              )}
            </p>
            <p className="truncate text-xs text-white/60">
              {user?.email || ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title={t("nav.logout")}
            className="text-white/70 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <ChevronDown className="h-4 w-4 text-white/50" />
        </div>
      </aside>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
