import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  BarChart3,
  Wallet,
  Settings,
  TrendingUp,
  Receipt,
  Lightbulb,
  Tag,
  Repeat,
  CreditCard,
  Wand2,
  Users,
  Users2,
  CalendarDays,
} from "lucide-react";
export const navLinks = [
  {
    to: "/dashboard",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/transactions",
    labelKey: "nav.transactions",
    icon: ArrowLeftRight,
  },
  {
    to: "/recurring",
    labelKey: "nav.recurring",
    icon: Repeat,
  },
  {
    to: "/calendar",
    labelKey: "nav.calendar",
    icon: CalendarDays,
    premium: true,
  },
  {
    to: "/categories",
    labelKey: "nav.categories",
    icon: Tag,
  },
  {
    to: "/merchant-rules",
    labelKey: "nav.merchantRules",
    icon: Wand2,
  },
  {
    to: "/budgets",
    labelKey: "nav.budget",
    icon: PieChart,
  },
  {
    to: "/households",
    labelKey: "nav.households",
    icon: Users,
  },
  {
    to: "/split-bills",
    labelKey: "nav.sharedExpenses",
    icon: Users2,
  },
  {
    to: "/goals",
    labelKey: "nav.goals",
    icon: Target,
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: BarChart3,
  },
  {
    to: "/accounts",
    labelKey: "nav.accounts",
    icon: Wallet,
  },
  {
    to: "/investments",
    labelKey: "nav.investments",
    icon: TrendingUp,
  },
  {
    to: "/bills",
    labelKey: "nav.bills",
    icon: Receipt,
  },
  {
    to: "/debts",
    labelKey: "nav.debtPayoff",
    icon: CreditCard,
  },
  {
    to: "/insights",
    labelKey: "nav.insights",
    icon: Lightbulb,
  },
  {
    to: "/settings",
    labelKey: "nav.settings",
    icon: Settings,
  },
];
