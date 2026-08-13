import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { Menu, WalletCards } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "../CommandPalette";
import { applyAccentColor } from "../../utils/accentColor";
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const accentColor = user?.premium?.isActive ? user?.accentColor : null;
  useEffect(() => {
    applyAccentColor(accentColor);
    return () => applyAccentColor(null);
  }, [accentColor]);
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <CommandPalette />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-300"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="flex items-center gap-2 text-lg font-bold text-brand-600">
            <WalletCards className="h-5 w-5" /> FinTrack
          </span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
