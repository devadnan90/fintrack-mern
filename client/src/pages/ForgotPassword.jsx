import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { forgotPassword } from "../features/auth/authSlice";
export default function ForgotPassword() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const result = await dispatch(forgotPassword(email));
    setSubmitting(false);
    if (forgotPassword.fulfilled.match(result)) {
      setSent(true);
    } else {
      toast.error(result.payload || "Something went wrong");
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">
          Forgot your password?
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a link to reset it.
        </p>

        {sent ? (
          <p className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
            If an account exists for that email, a reset link is on its way.
            Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

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
