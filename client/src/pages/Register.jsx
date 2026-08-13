import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { registerUser } from "../features/auth/authSlice";
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "PKR", "BDT"];
export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const status = useSelector((state) => state.auth.status);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    baseCurrency: "USD",
  });
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error(t("auth.register.toastPasswordLength"));
      return;
    }
    if (!/\d/.test(form.password)) {
      toast.error(t("auth.register.toastPasswordNumber"));
      return;
    }
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      toast.success(t("auth.register.toastSuccess"));
      navigate("/dashboard");
    } else {
      toast.error(result.payload || t("auth.register.toastFailed"));
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("auth.register.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("auth.register.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.register.name")}
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.register.email")}
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.register.password")}
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              {t("auth.register.passwordHint")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("auth.register.baseCurrency")}
            </label>
            <select
              name="baseCurrency"
              value={form.baseCurrency}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {status === "loading"
              ? t("auth.register.submitting")
              : t("auth.register.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.register.alreadyHaveAccount")}{" "}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            {t("auth.register.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
