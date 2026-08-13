import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { KeyRound, WalletCards, Check } from "lucide-react";
import {
  loginUser,
  verifyTwoFactorLogin,
  cancelTwoFactorLogin,
  passkeyLogin,
} from "../features/auth/authSlice";
import { authAPI } from "../features/auth/authAPI";
import HeroIllustration from "../components/HeroIllustration";
function BrandPanel({ t }) {
  const features = [
    t("auth.login.brandFeature1"),
    t("auth.login.brandFeature2"),
    t("auth.login.brandFeature3"),
  ];
  return (
    <div className="relative hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex xl:p-14">
      {}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

      <Link
        to="/"
        className="relative flex items-center gap-2 text-lg font-bold"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
          <WalletCards className="h-5 w-5" />
        </span>
        FinTrack
      </Link>

      <div className="relative">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {t("landing.eyebrow")}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-4 max-w-md text-white/75">
          {t("landing.heroSubtitle")}
        </p>

        <ul className="mt-7 space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 text-sm text-white/90"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-10 hidden xl:block">
          <HeroIllustration />
        </div>
      </div>

      <p className="relative text-xs text-white/50">
        © {new Date().getFullYear()} FinTrack
      </p>
    </div>
  );
}
export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const status = useSelector((state) => state.auth.status);
  const twoFactorPending = useSelector((state) => state.auth.twoFactorPending);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  function handleChange(e) {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      if (result.payload.requiresTwoFactor) return;
      toast.success(t("auth.login.toastWelcome"));
      navigate("/dashboard");
    } else {
      toast.error(result.payload || t("auth.login.toastLoginFailed"));
    }
  }
  async function handlePasskeyLogin() {
    if (!form.email) {
      toast.error(t("auth.login.toastEnterEmail"));
      return;
    }
    if (!browserSupportsWebAuthn()) {
      toast.error(t("auth.login.toastNoBrowserSupport"));
      return;
    }
    setPasskeyLoading(true);
    try {
      const optionsJSON = await authAPI.passkeyLoginOptions(form.email);
      const response = await startAuthentication({
        optionsJSON,
      });
      const result = await dispatch(
        passkeyLogin({
          email: form.email,
          response,
        }),
      );
      if (passkeyLogin.fulfilled.match(result)) {
        toast.success(t("auth.login.toastWelcome"));
        navigate("/dashboard");
      } else {
        toast.error(result.payload || t("auth.login.toastPasskeyFailed"));
      }
    } catch {
      toast.error(t("auth.login.toastNoPasskey"));
    } finally {
      setPasskeyLoading(false);
    }
  }
  async function handleVerify(e) {
    e.preventDefault();
    const payload = {
      twoFactorToken: twoFactorPending.twoFactorToken,
    };
    if (useBackupCode) payload.backupCode = code;
    else payload.token = code;
    const result = await dispatch(verifyTwoFactorLogin(payload));
    if (verifyTwoFactorLogin.fulfilled.match(result)) {
      toast.success(t("auth.login.toastWelcome"));
      navigate("/dashboard");
    } else {
      toast.error(result.payload || t("auth.login.toastInvalidCode"));
    }
  }
  return (
    <div className="flex min-h-screen bg-white">
      <BrandPanel t={t} />

      <div className="flex w-full flex-1 items-center justify-center bg-gray-50 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 flex items-center gap-2 text-lg font-bold text-brand-700 lg:hidden"
          >
            <WalletCards className="h-6 w-6" /> FinTrack
          </Link>

          {twoFactorPending ? (
            <div className="rounded-2xl bg-white p-8 shadow-lg shadow-gray-200/60 ring-1 ring-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("auth.login.twoFactorTitle")}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {useBackupCode
                  ? t("auth.login.twoFactorSubtitleBackup")
                  : t("auth.login.twoFactorSubtitleTotp")}
              </p>

              <form onSubmit={handleVerify} className="mt-6 space-y-4">
                <input
                  autoFocus
                  required
                  inputMode={useBackupCode ? "text" : "numeric"}
                  placeholder={
                    useBackupCode
                      ? t("auth.login.backupCodePlaceholder")
                      : t("auth.login.codePlaceholder")
                  }
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
                >
                  {status === "loading"
                    ? t("auth.login.verifying")
                    : t("auth.login.verify")}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => {
                    setUseBackupCode((v) => !v);
                    setCode("");
                  }}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {useBackupCode
                    ? t("auth.login.useAuthenticatorCode")
                    : t("auth.login.useBackupCode")}
                </button>
                <button
                  onClick={() => {
                    dispatch(cancelTwoFactorLogin());
                    setCode("");
                  }}
                  className="text-gray-500 hover:underline"
                >
                  {t("auth.login.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 shadow-lg shadow-gray-200/60 ring-1 ring-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">
                {t("auth.login.title")}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t("auth.login.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("auth.login.email")}
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
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("auth.login.password")}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      {t("auth.login.forgotPassword")}
                    </Link>
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
                >
                  {status === "loading"
                    ? t("auth.login.submitting")
                    : t("auth.login.submit")}
                </button>
              </form>

              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                {t("auth.login.or")}
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />{" "}
                {passkeyLoading
                  ? t("auth.login.passkeyWaiting")
                  : t("auth.login.passkeyButton")}
              </button>

              <p className="mt-6 text-center text-sm text-gray-500">
                {t("auth.login.noAccount")}{" "}
                <Link
                  to="/register"
                  className="font-medium text-brand-600 hover:underline"
                >
                  {t("auth.login.signUp")}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
