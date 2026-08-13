import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { resetPassword } from "../features/auth/authSlice";
export default function ResetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      toast.error("This reset link is missing its token. Request a new one.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const result = await dispatch(
      resetPassword({
        token,
        newPassword: form.newPassword,
      }),
    );
    setSubmitting(false);
    if (resetPassword.fulfilled.match(result)) {
      toast.success("Password reset. Please log in.");
      navigate("/login");
    } else {
      toast.error(result.payload || "Failed to reset password");
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a new password for your account.
        </p>

        {!token && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            This link is missing a reset token. Go back and request a new one.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              value={form.newPassword}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              At least 8 characters, with a number.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
