import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Check, Loader2, X } from "lucide-react";
import { paymentsAPI } from "../features/payments/paymentsAPI";
import { verifyPremiumPayment } from "../features/auth/authSlice";
import {
  loadRazorpayCheckout,
  openRazorpayCheckout,
} from "../utils/razorpayCheckout";
function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}
export default function UpgradeModal({ open, onClose }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    if (!open) return;
    setLoadingConfig(true);
    paymentsAPI
      .config()
      .then((data) => {
        setConfig(data);
        setSelectedPlan(
          (prev) => prev || data.plans?.[1]?.id || data.plans?.[0]?.id || null,
        );
      })
      .catch(() =>
        setConfig({
          enabled: false,
          plans: [],
        }),
      )
      .finally(() => setLoadingConfig(false));
  }, [open]);
  if (!open) return null;
  const plans = config?.plans || [];
  const monthly = plans.find((p) => p.id === "monthly");
  function savingsFor(plan) {
    if (!monthly || plan.id === "monthly" || !monthly.amount) return null;
    const monthlyPerDay = monthly.amount / monthly.days;
    const planPerDay = plan.amount / plan.days;
    const pct = Math.round((1 - planPerDay / monthlyPerDay) * 100);
    return pct > 0 ? pct : null;
  }
  async function handleCheckout() {
    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;
    setProcessing(true);
    try {
      const { order } = await paymentsAPI.createOrder(plan.id);
      await loadRazorpayCheckout();
      const response = await openRazorpayCheckout({
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "FinTrack",
        description: t(`nav.plan.${plan.id}`),
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#2f4bc0",
        },
      });
      const result = await dispatch(verifyPremiumPayment(response));
      if (verifyPremiumPayment.fulfilled.match(result)) {
        toast.success(t("nav.toastPremiumActivated"));
        onClose();
      } else {
        toast.error(result.payload || t("nav.toastVerifyFailed"));
      }
    } catch (err) {
      if (err.message === "dismissed") {
        toast(t("nav.toastPaymentCancelled"));
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            t("nav.toastPaymentFailed"),
        );
      }
    } finally {
      setProcessing(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t("nav.upgradeModalTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("nav.upgradeModalSubtitle")}
        </p>

        {loadingConfig ? (
          <div className="mt-8 flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : !config?.enabled ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {t("nav.toastNotConfigured")}
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const savings = savingsFor(plan);
                const selected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-colors ${selected ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10" : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"}`}
                  >
                    {savings && (
                      <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {t("nav.plan.savePercent", {
                          percent: savings,
                        })}
                      </span>
                    )}
                    {selected && (
                      <Check className="absolute top-3 right-3 h-4 w-4 text-brand-600 dark:text-brand-300" />
                    )}
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t(`nav.plan.${plan.id}`)}
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatPrice(plan.amount, plan.currency)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t(`nav.plan.${plan.id}Duration`)}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing || !selectedPlan}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {processing
                ? t("nav.upgradeOpening")
                : t("nav.proceedToCheckout")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
