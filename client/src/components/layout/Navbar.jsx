import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { logoutUser } from "../../features/auth/authSlice";
const links = [
  {
    to: "/dashboard",
    label: "Dashboard",
  },
  {
    to: "/accounts",
    label: "Accounts",
  },
  {
    to: "/transactions",
    label: "Transactions",
  },
  {
    to: "/investments",
    label: "Investments",
  },
  {
    to: "/budgets",
    label: "Budgets",
  },
  {
    to: "/goals",
    label: "Goals",
  },
  {
    to: "/bills",
    label: "Bills",
  },
  {
    to: "/reports",
    label: "Reports",
  },
  {
    to: "/insights",
    label: "Insights",
  },
];
export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  async function handleLogout() {
    await dispatch(logoutUser());
    toast.success("Logged out");
    navigate("/login");
  }
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <span className="text-lg font-bold text-brand-600">FinTrack</span>
          <nav className="hidden gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink
            to="/settings"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {user?.name || "Account"}
          </NavLink>
          <button
            onClick={handleLogout}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
