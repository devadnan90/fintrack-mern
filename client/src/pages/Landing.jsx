import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HeroIllustration from "../components/HeroIllustration";
export default function Landing() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-brand-700">FinTrack</span>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            {t("landing.login")}
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t("landing.getStarted")}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 py-12 lg:flex-row lg:gap-6">
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {t("landing.eyebrow")}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Link
              to="/register"
              className="rounded-md bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-brand-700"
            >
              {t("landing.ctaPrimary")}
            </Link>
            <Link
              to="/login"
              className="rounded-md px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-100"
            >
              {t("landing.ctaSecondary")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-400">{t("landing.footnote")}</p>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <HeroIllustration />
        </div>
      </main>
    </div>
  );
}
