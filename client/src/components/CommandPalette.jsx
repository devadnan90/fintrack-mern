import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Search, Plus, LogOut, Sun, Moon, CornerDownLeft } from "lucide-react";
import { navLinks } from "../config/navLinks";
import { logoutUser } from "../features/auth/authSlice";
import useTheme from "../utils/useTheme";
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const actions = useMemo(
    () => [
      {
        id: "add-transaction",
        label: t("commandPalette.addTransaction"),
        icon: Plus,
        run: () => navigate("/transactions?new=1"),
      },
      {
        id: "toggle-theme",
        label:
          theme === "dark"
            ? t("commandPalette.switchToLight")
            : t("commandPalette.switchToDark"),
        icon: theme === "dark" ? Sun : Moon,
        run: toggleTheme,
      },
      {
        id: "logout",
        label: t("nav.logout"),
        icon: LogOut,
        run: async () => {
          await dispatch(logoutUser());
          toast.success(t("nav.loggedOut"));
          navigate("/login");
        },
      },
    ],
    [theme, toggleTheme, dispatch, navigate, t],
  );
  const navItems = useMemo(
    () =>
      navLinks.map((l) => ({
        id: l.to,
        label: t(l.labelKey),
        icon: l.icon,
        run: () => navigate(l.to),
      })),
    [navigate, t],
  );
  const allItems = useMemo(
    () => [...actions, ...navItems],
    [actions, navItems],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [allItems, query]);
  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }
  function activate(item) {
    if (!item) return;
    close();
    item.run();
  }
  useEffect(() => {
    function handleKeyDown(e) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);
  useEffect(() => {
    function handleOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("open-command-palette", handleOpenRequest);
    return () =>
      window.removeEventListener("open-command-palette", handleOpenRequest);
  }, []);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);
  function handleInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(filtered[activeIndex]);
    }
  }
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[60vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("commandPalette.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
          />
          <kbd className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 dark:border-gray-600 dark:text-gray-500">
            Esc
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {t("commandPalette.noMatches")}
            </p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => activate(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === activeIndex ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "text-gray-700 dark:text-gray-300"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {i === activeIndex && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
