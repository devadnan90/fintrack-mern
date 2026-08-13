import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import {
  User,
  KeyRound,
  Palette,
  Moon,
  Sun,
  Save,
  Camera,
  Download,
  ShieldAlert,
  Trash2,
  Mail,
  Coins,
  ShieldCheck,
  Copy,
  Fingerprint,
  BellRing,
  FileClock,
  Languages,
  Crown,
} from "lucide-react";
import UpgradeModal from "../components/UpgradeModal";
import { isValidHexColor } from "../utils/accentColor";
import {
  updateProfile,
  changePassword,
  deleteAccount,
  logoutUser,
  confirmTwoFactorSetup,
  disableTwoFactorAuth,
} from "../features/auth/authSlice";
import { fetchAccounts } from "../features/accounts/accountsSlice";
import { usersAPI } from "../features/users/usersAPI";
import { pushAPI } from "../features/push/pushAPI";
import { reportsAPI } from "../features/reports/reportsAPI";
import { formatDate } from "../utils/format";
import useTheme from "../utils/useTheme";
import { resizeImageToDataUrl } from "../utils/imageResize";
import {
  browserSupportsPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "../utils/webPush";
import { SUPPORTED_LANGUAGES } from "../i18n";
const ROUND_TO_CHOICES = [
  {
    value: 50,
    label: "$0.50",
  },
  {
    value: 100,
    label: "$1.00",
  },
  {
    value: 500,
    label: "$5.00",
  },
];
const ACCENT_PRESETS = [
  "#2f4bc0",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#0369a1",
];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "SGD"];
const DATE_FORMATS = [
  {
    value: "MDY",
    label: "MM/DD/YYYY (e.g. 07/25/2026)",
  },
  {
    value: "DMY",
    label: "DD/MM/YYYY (e.g. 25/07/2026)",
  },
  {
    value: "YMD",
    label: "YYYY-MM-DD (e.g. 2026-07-25)",
  },
];
const EMAIL_PREF_KEYS = [
  "billReminders",
  "budgetAlerts",
  "goalMilestones",
  "anomalyAlerts",
];
function initials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const accounts = useSelector((state) => state.accounts.items);
  const { theme, toggleTheme } = useTheme();
  const avatarInputRef = useRef(null);
  const isPremium = Boolean(user?.premium?.isActive);
  const [savingAccent, setSavingAccent] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const WEEKDAYS = t("settings.scheduledReports.weekdayNames", {
    returnObjects: true,
  }).map((label, value) => ({
    value,
    label,
  }));
  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);
  const [passkeys, setPasskeys] = useState([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [addingPasskey, setAddingPasskey] = useState(false);
  useEffect(() => {
    usersAPI
      .listPasskeys()
      .then(setPasskeys)
      .catch(() => toast.error(t("settings.passkeys.toastListFailed")))
      .finally(() => setLoadingPasskeys(false));
  }, []);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    baseCurrency: user?.baseCurrency || "USD",
    dateFormat: user?.dateFormat || "MDY",
    avatar: user?.avatar || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState("idle");
  const [twoFaSetup, setTwoFaSetup] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableForm, setDisableForm] = useState({
    password: "",
    token: "",
  });
  const [savingTwoFa, setSavingTwoFa] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({
    billReminders: user?.emailNotifications?.billReminders ?? true,
    budgetAlerts: user?.emailNotifications?.budgetAlerts ?? true,
    goalMilestones: user?.emailNotifications?.goalMilestones ?? true,
  });
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);
  const [roundUpForm, setRoundUpForm] = useState({
    enabled: user?.roundUpSavings?.enabled ?? false,
    destinationAccount: user?.roundUpSavings?.destinationAccount || "",
    roundToCents: user?.roundUpSavings?.roundToCents ?? 100,
  });
  const [savingRoundUp, setSavingRoundUp] = useState(false);
  const [scheduledReportsForm, setScheduledReportsForm] = useState({
    enabled: user?.scheduledReports?.enabled ?? false,
    frequency: user?.scheduledReports?.frequency ?? "weekly",
    dayOfWeek: user?.scheduledReports?.dayOfWeek ?? 1,
    dayOfMonth: user?.scheduledReports?.dayOfMonth ?? 1,
  });
  const [savingScheduledReports, setSavingScheduledReports] = useState(false);
  const [sendingReportNow, setSendingReportNow] = useState(false);
  const [pushStatus, setPushStatus] = useState({
    subscribed: false,
    configured: true,
  });
  const [loadingPush, setLoadingPush] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);
  useEffect(() => {
    pushAPI
      .status()
      .then(setPushStatus)
      .catch(() => {})
      .finally(() => setLoadingPush(false));
  }, []);
  const [exporting, setExporting] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  function handleProfileChange(e) {
    setProfileForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setProfileForm((f) => ({
        ...f,
        avatar: dataUrl,
      }));
    } catch {
      toast.error(t("settings.profile.avatarReadFailed"));
    } finally {
      e.target.value = "";
    }
  }
  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    const result = await dispatch(updateProfile(profileForm));
    setSavingProfile(false);
    if (updateProfile.fulfilled.match(result)) {
      toast.success(t("settings.profile.toastUpdated"));
    } else {
      toast.error(result.payload || t("settings.profile.toastFailed"));
    }
  }
  function handlePasswordChange(e) {
    setPasswordForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  }
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("settings.password.toastMismatch"));
      return;
    }
    setSavingPassword(true);
    const result = await dispatch(
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    );
    setSavingPassword(false);
    if (changePassword.fulfilled.match(result)) {
      toast.success(t("settings.password.toastChanged"));
      await dispatch(logoutUser());
      navigate("/login");
    } else {
      toast.error(result.payload || t("settings.password.toastFailed"));
    }
  }
  async function toggleEmailPref(key) {
    const next = {
      ...emailPrefs,
      [key]: !emailPrefs[key],
    };
    setEmailPrefs(next);
    setSavingEmailPrefs(true);
    const result = await dispatch(
      updateProfile({
        emailNotifications: next,
      }),
    );
    setSavingEmailPrefs(false);
    if (!updateProfile.fulfilled.match(result)) {
      setEmailPrefs(emailPrefs);
      toast.error(
        result.payload || t("settings.emailNotifications.toastFailed"),
      );
    }
  }
  async function handleStartTwoFa() {
    setSavingTwoFa(true);
    try {
      const setup = await usersAPI.startTwoFactorSetup();
      setTwoFaSetup(setup);
      setTwoFaStep("setup");
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("settings.twoFactor.toastStartFailed"),
      );
    } finally {
      setSavingTwoFa(false);
    }
  }
  async function handleConfirmTwoFa(e) {
    e.preventDefault();
    setSavingTwoFa(true);
    const result = await dispatch(confirmTwoFactorSetup(twoFaCode));
    setSavingTwoFa(false);
    if (confirmTwoFactorSetup.fulfilled.match(result)) {
      setBackupCodes(result.payload.backupCodes);
      setTwoFaStep("backup-codes");
      setTwoFaCode("");
    } else {
      toast.error(result.payload || t("settings.twoFactor.toastInvalidCode"));
    }
  }
  function handleFinishTwoFaSetup() {
    setTwoFaStep("idle");
    setTwoFaSetup(null);
    setBackupCodes([]);
    toast.success(t("settings.twoFactor.toastEnabled"));
  }
  async function handleDisableTwoFa(e) {
    e.preventDefault();
    setSavingTwoFa(true);
    const result = await dispatch(disableTwoFactorAuth(disableForm));
    setSavingTwoFa(false);
    if (disableTwoFactorAuth.fulfilled.match(result)) {
      toast.success(t("settings.twoFactor.toastDisabled"));
      setTwoFaStep("idle");
      setDisableForm({
        password: "",
        token: "",
      });
    } else {
      toast.error(result.payload || t("settings.twoFactor.toastDisableFailed"));
    }
  }
  async function handleAddPasskey() {
    if (!browserSupportsWebAuthn()) {
      toast.error(t("settings.passkeys.toastNoSupport"));
      return;
    }
    setAddingPasskey(true);
    try {
      const optionsJSON = await usersAPI.startPasskeyRegistration();
      const response = await startRegistration({
        optionsJSON,
      });
      const name =
        prompt(
          t("settings.passkeys.namePrompt"),
          t("settings.passkeys.defaultName"),
        ) || t("settings.passkeys.defaultName");
      const passkey = await usersAPI.finishPasskeyRegistration(response, name);
      setPasskeys((list) => [passkey, ...list]);
      toast.success(t("settings.passkeys.toastAdded"));
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("settings.passkeys.toastAddFailed"),
      );
    } finally {
      setAddingPasskey(false);
    }
  }
  async function handleDeletePasskey(passkey) {
    if (
      !confirm(
        t("settings.passkeys.confirmRemove", {
          name: passkey.name,
        }),
      )
    )
      return;
    try {
      await usersAPI.deletePasskey(passkey.id);
      setPasskeys((list) => list.filter((p) => p.id !== passkey.id));
      toast.success(t("settings.passkeys.toastRemoved"));
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("settings.passkeys.toastRemoveFailed"),
      );
    }
  }
  async function handleTogglePush() {
    if (!browserSupportsPush()) {
      toast.error(t("settings.push.toastNoSupport"));
      return;
    }
    setTogglingPush(true);
    try {
      if (pushStatus.subscribed) {
        await unsubscribeFromPush();
        setPushStatus((s) => ({
          ...s,
          subscribed: false,
        }));
        toast.success(t("settings.push.toastOff"));
      } else {
        await subscribeToPush();
        setPushStatus((s) => ({
          ...s,
          subscribed: true,
        }));
        toast.success(t("settings.push.toastOn"));
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          t("settings.push.toastFailed"),
      );
    } finally {
      setTogglingPush(false);
    }
  }
  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
    toast.success(t("common.copied"));
  }
  async function handleSetAccent(hex) {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    setSavingAccent(true);
    const result = await dispatch(
      updateProfile({
        accentColor: hex,
      }),
    );
    setSavingAccent(false);
    if (!updateProfile.fulfilled.match(result)) {
      toast.error(result.payload || t("settings.appearance.toastAccentFailed"));
    }
  }
  async function saveRoundUp(next) {
    if (next.enabled && !next.destinationAccount) {
      toast.error(t("settings.roundUp.toastNeedAccount"));
      return;
    }
    setRoundUpForm(next);
    setSavingRoundUp(true);
    const result = await dispatch(
      updateProfile({
        roundUpSavings: {
          enabled: next.enabled,
          destinationAccount: next.destinationAccount || null,
          roundToCents: Number(next.roundToCents),
        },
      }),
    );
    setSavingRoundUp(false);
    if (updateProfile.fulfilled.match(result)) {
      toast.success(t("settings.roundUp.toastUpdated"));
    } else {
      toast.error(result.payload || t("settings.roundUp.toastFailed"));
    }
  }
  async function saveScheduledReports(next) {
    setScheduledReportsForm(next);
    setSavingScheduledReports(true);
    const result = await dispatch(
      updateProfile({
        scheduledReports: {
          enabled: next.enabled,
          frequency: next.frequency,
          dayOfWeek: Number(next.dayOfWeek),
          dayOfMonth: Number(next.dayOfMonth),
        },
      }),
    );
    setSavingScheduledReports(false);
    if (updateProfile.fulfilled.match(result)) {
      toast.success(t("settings.scheduledReports.toastUpdated"));
    } else {
      toast.error(result.payload || t("settings.scheduledReports.toastFailed"));
    }
  }
  async function handleSendReportNow() {
    setSendingReportNow(true);
    try {
      await reportsAPI.sendReportNow(scheduledReportsForm.frequency);
      toast.success(
        t("settings.scheduledReports.toastSent", {
          email: user?.email,
        }),
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          t("settings.scheduledReports.toastSendFailed"),
      );
    } finally {
      setSendingReportNow(false);
    }
  }
  async function handleExport() {
    setExporting(true);
    try {
      const blob = await usersAPI.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fintrack-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("settings.data.toastFailed"));
    } finally {
      setExporting(false);
    }
  }
  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (!confirm(t("settings.danger.confirmDelete"))) return;
    setDeleting(true);
    const result = await dispatch(deleteAccount(deletePassword));
    setDeleting(false);
    if (deleteAccount.fulfilled.match(result)) {
      toast.success(t("settings.danger.toastDeleted"));
      navigate("/");
    } else {
      toast.error(result.payload || t("settings.danger.toastFailed"));
    }
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t("settings.title")}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("settings.subtitle")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleProfileSubmit}
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <User className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.profile.title")}
              </h2>
              {user?.createdAt && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("settings.profile.memberSince", {
                    date: formatDate(user.createdAt, profileForm.dateFormat),
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
            >
              {profileForm.avatar ? (
                <img
                  src={profileForm.avatar}
                  alt={t("settings.profile.avatarAlt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  {initials(user?.name)}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarPick}
              className="hidden"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("settings.profile.avatarHint")}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.profile.name")}
              </label>
              <input
                name="name"
                required
                value={profileForm.name}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.profile.email")}
              </label>
              <input
                value={user?.email || ""}
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("settings.profile.emailHint")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.profile.baseCurrency")}
              </label>
              <select
                name="baseCurrency"
                value={profileForm.baseCurrency}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.profile.dateFormat")}
              </label>
              <select
                name="dateFormat"
                value={profileForm.dateFormat}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />{" "}
              {savingProfile
                ? t("settings.profile.saving")
                : t("settings.profile.save")}
            </button>
          </div>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <KeyRound className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.password.title")}
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.password.current")}
              </label>
              <input
                name="currentPassword"
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.password.new")}
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("settings.password.newHint")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.password.confirm")}
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />{" "}
              {savingPassword
                ? t("settings.password.submitting")
                : t("settings.password.submit")}
            </button>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {t("settings.password.hint")}
            </p>
          </div>
        </form>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.twoFactor.title")}
            </h2>
          </div>

          {twoFaStep === "idle" && (
            <>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {user?.twoFactorEnabled
                  ? t("settings.twoFactor.enabledDesc")
                  : t("settings.twoFactor.disabledDesc")}
              </p>
              {user?.twoFactorEnabled ? (
                <button
                  onClick={() => setTwoFaStep("disable")}
                  className="mt-4 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {t("settings.twoFactor.disable")}
                </button>
              ) : (
                <button
                  onClick={handleStartTwoFa}
                  disabled={savingTwoFa}
                  className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {savingTwoFa
                    ? t("settings.twoFactor.enabling")
                    : t("settings.twoFactor.enable")}
                </button>
              )}
            </>
          )}

          {twoFaStep === "setup" && twoFaSetup && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("settings.twoFactor.setupInstructions")}
              </p>
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                <img
                  src={twoFaSetup.qrCodeDataUrl}
                  alt="2FA QR code"
                  className="h-40 w-40 rounded-md ring-1 ring-gray-200 dark:ring-gray-700"
                />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.twoFactor.cantScan")}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-900 dark:text-gray-300">
                      {twoFaSetup.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(twoFaSetup.secret)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <form
                    onSubmit={handleConfirmTwoFa}
                    className="mt-4 flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      required
                      placeholder="123456"
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value)}
                      className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                    />
                    <button
                      type="submit"
                      disabled={savingTwoFa}
                      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {savingTwoFa
                        ? t("settings.twoFactor.verifying")
                        : t("settings.twoFactor.confirm")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFaStep("idle")}
                      className="text-sm text-gray-500 dark:text-gray-400"
                    >
                      {t("settings.twoFactor.cancel")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {twoFaStep === "backup-codes" && (
            <div className="mt-4">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t("settings.twoFactor.backupCodesIntro")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-4 font-mono text-sm dark:bg-gray-900 sm:grid-cols-4">
                {backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => copyToClipboard(backupCodes.join("\n"))}
                  className="flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <Copy className="h-4 w-4" />{" "}
                  {t("settings.twoFactor.copyCodes")}
                </button>
                <button
                  onClick={handleFinishTwoFaSetup}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {t("settings.twoFactor.savedThese")}
                </button>
              </div>
            </div>
          )}

          {twoFaStep === "disable" && (
            <form onSubmit={handleDisableTwoFa} className="mt-4 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.twoFactor.confirmToDisable")}
              </p>
              <input
                type="password"
                required
                placeholder={t("settings.twoFactor.currentPasswordPlaceholder")}
                value={disableForm.password}
                onChange={(e) =>
                  setDisableForm((f) => ({
                    ...f,
                    password: e.target.value,
                  }))
                }
                className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
              <input
                required
                placeholder={t("settings.twoFactor.tokenPlaceholder")}
                value={disableForm.token}
                onChange={(e) =>
                  setDisableForm((f) => ({
                    ...f,
                    token: e.target.value,
                  }))
                }
                className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingTwoFa}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {savingTwoFa
                    ? t("settings.twoFactor.disabling")
                    : t("settings.twoFactor.disable")}
                </button>
                <button
                  type="button"
                  onClick={() => setTwoFaStep("idle")}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {t("settings.twoFactor.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                <Fingerprint className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.passkeys.title")}
              </h2>
            </div>
            <button
              onClick={handleAddPasskey}
              disabled={addingPasskey}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {addingPasskey
                ? t("settings.passkeys.adding")
                : t("settings.passkeys.add")}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.passkeys.subtitle")}
          </p>

          {loadingPasskeys ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t("settings.passkeys.loading")}
            </p>
          ) : passkeys.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              {t("settings.passkeys.noPasskeys")}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-50 dark:divide-gray-700">
              {passkeys.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {p.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {t("settings.passkeys.addedOn", {
                        date: formatDate(p.createdAt, profileForm.dateFormat),
                      })}
                      {p.lastUsedAt
                        ? ` · ${t("settings.passkeys.lastUsed", {
                            date: formatDate(
                              p.lastUsedAt,
                              profileForm.dateFormat,
                            ),
                          })}`
                        : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePasskey(p)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    {t("settings.passkeys.remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <BellRing className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.push.title")}
              </h2>
            </div>
            {pushStatus.configured && (
              <button
                onClick={handleTogglePush}
                disabled={togglingPush || loadingPush}
                role="switch"
                aria-checked={pushStatus.subscribed}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${pushStatus.subscribed ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"}`}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: pushStatus.subscribed
                      ? "translateX(20px)"
                      : "translateX(0px)",
                  }}
                />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {pushStatus.configured
              ? t("settings.push.subtitleConfigured")
              : t("settings.push.subtitleUnconfigured")}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Palette className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.appearance.title")}
            </h2>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
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
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-amber-400" : "bg-gray-200 dark:bg-gray-600"}`}
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

          <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Languages className="h-4 w-4" />
              {t("common.language")}
            </span>
            <select
              value={i18n.resolvedLanguage || i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Palette className="h-4 w-4" />
                {t("settings.appearance.accentColor")}
              </span>
              {!isPremium && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  <Crown className="h-3.5 w-3.5" />{" "}
                  {t("settings.appearance.accentPremiumOnly")}
                </button>
              )}
            </div>
            <div
              className={`mt-3 flex flex-wrap items-center gap-2 ${!isPremium ? "opacity-50" : ""}`}
            >
              {ACCENT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  disabled={savingAccent}
                  onClick={() => handleSetAccent(hex)}
                  className={`h-7 w-7 rounded-full disabled:opacity-60 ${user?.accentColor === hex ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : ""}`}
                  style={{
                    backgroundColor: hex,
                  }}
                  title={hex}
                />
              ))}
              <label
                className={`flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-[9px] text-gray-400 dark:border-gray-600 ${isPremium ? "cursor-pointer" : "cursor-not-allowed"}`}
                title={t("settings.appearance.accentCustom")}
              >
                +
                <input
                  type="color"
                  disabled={!isPremium || savingAccent}
                  value={
                    isValidHexColor(user?.accentColor)
                      ? user.accentColor
                      : "#2f4bc0"
                  }
                  onChange={(e) => handleSetAccent(e.target.value)}
                  className="sr-only"
                />
              </label>
              {isPremium && user?.accentColor && (
                <button
                  onClick={() => handleSetAccent(null)}
                  disabled={savingAccent}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {t("settings.appearance.accentReset")}
                </button>
              )}
            </div>
          </div>
        </div>

        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
        />

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
              <Mail className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.emailNotifications.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.emailNotifications.subtitle", {
              email: user?.email,
            })}
          </p>
          <div className="mt-4 space-y-2">
            {EMAIL_PREF_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700"
              >
                <span>
                  <span className="block text-sm text-gray-700 dark:text-gray-300">
                    {t(`settings.emailNotifications.fields.${key}.label`)}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    {t(`settings.emailNotifications.fields.${key}.description`)}
                  </span>
                </span>
                <button
                  onClick={() => toggleEmailPref(key)}
                  disabled={savingEmailPrefs}
                  role="switch"
                  aria-checked={emailPrefs[key]}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${emailPrefs[key] ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"}`}
                >
                  <span
                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{
                      transform: emailPrefs[key]
                        ? "translateX(20px)"
                        : "translateX(0px)",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Coins className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.roundUp.title")}
              </h2>
            </div>
            <button
              onClick={() =>
                saveRoundUp({
                  ...roundUpForm,
                  enabled: !roundUpForm.enabled,
                })
              }
              disabled={savingRoundUp}
              role="switch"
              aria-checked={roundUpForm.enabled}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${roundUpForm.enabled ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"}`}
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{
                  transform: roundUpForm.enabled
                    ? "translateX(20px)"
                    : "translateX(0px)",
                }}
              />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.roundUp.subtitle")}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.roundUp.destinationAccount")}
              </label>
              <select
                value={roundUpForm.destinationAccount}
                onChange={(e) =>
                  saveRoundUp({
                    ...roundUpForm,
                    destinationAccount: e.target.value,
                  })
                }
                disabled={savingRoundUp}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="">{t("settings.roundUp.selectAccount")}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.roundUp.roundTo")}
              </label>
              <select
                value={roundUpForm.roundToCents}
                onChange={(e) =>
                  saveRoundUp({
                    ...roundUpForm,
                    roundToCents: Number(e.target.value),
                  })
                }
                disabled={savingRoundUp}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
              >
                {ROUND_TO_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <FileClock className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("settings.scheduledReports.title")}
              </h2>
            </div>
            <button
              onClick={() =>
                saveScheduledReports({
                  ...scheduledReportsForm,
                  enabled: !scheduledReportsForm.enabled,
                })
              }
              disabled={savingScheduledReports}
              role="switch"
              aria-checked={scheduledReportsForm.enabled}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${scheduledReportsForm.enabled ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"}`}
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{
                  transform: scheduledReportsForm.enabled
                    ? "translateX(20px)"
                    : "translateX(0px)",
                }}
              />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.scheduledReports.subtitle", {
              email: user?.email,
            })}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.scheduledReports.frequency")}
              </label>
              <select
                value={scheduledReportsForm.frequency}
                onChange={(e) =>
                  saveScheduledReports({
                    ...scheduledReportsForm,
                    frequency: e.target.value,
                  })
                }
                disabled={savingScheduledReports}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="weekly">
                  {t("settings.scheduledReports.weekly")}
                </option>
                <option value="monthly">
                  {t("settings.scheduledReports.monthly")}
                </option>
              </select>
            </div>
            {scheduledReportsForm.frequency === "weekly" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.scheduledReports.on")}
                </label>
                <select
                  value={scheduledReportsForm.dayOfWeek}
                  onChange={(e) =>
                    saveScheduledReports({
                      ...scheduledReportsForm,
                      dayOfWeek: e.target.value,
                    })
                  }
                  disabled={savingScheduledReports}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.scheduledReports.dayOfMonth")}
                </label>
                <select
                  value={scheduledReportsForm.dayOfMonth}
                  onChange={(e) =>
                    saveScheduledReports({
                      ...scheduledReportsForm,
                      dayOfMonth: e.target.value,
                    })
                  }
                  disabled={savingScheduledReports}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
                >
                  {Array.from(
                    {
                      length: 28,
                    },
                    (_, i) => i + 1,
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleSendReportNow}
              disabled={sendingReportNow}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {sendingReportNow
                ? t("settings.scheduledReports.sending")
                : t("settings.scheduledReports.sendNow")}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <Download className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.data.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.data.subtitle")}
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4" />{" "}
            {exporting
              ? t("settings.data.preparing")
              : t("settings.data.download")}
          </button>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-red-100 dark:bg-gray-800 dark:ring-red-500/20 lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.danger.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.danger.subtitle")}
          </p>

          {showDeleteForm ? (
            <form
              onSubmit={handleDeleteAccount}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.danger.confirmPassword")}
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="mt-1 w-56 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
                />
              </div>
              <button
                type="submit"
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />{" "}
                {deleting
                  ? t("settings.danger.deleting")
                  : t("settings.danger.deleteButton")}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteForm(false)}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {t("common.cancel")}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="mt-4 flex items-center gap-1.5 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />{" "}
              {t("settings.danger.deleteAccount")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
