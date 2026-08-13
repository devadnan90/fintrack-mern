import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { accountsAPI } from "../features/accounts/accountsAPI";
import { formatMoney, formatDate } from "../utils/format";
export default function AccountDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const dateFormat = useSelector((state) => state.auth.user?.dateFormat);
  useEffect(() => {
    let cancelled = false;
    accountsAPI
      .get(id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load account");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (error) {
    return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;
  }
  if (!data) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    );
  }
  const { account, recentTransactions } = data;
  return (
    <div>
      <Link
        to="/accounts"
        className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All accounts
      </Link>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {account.name}
          </h1>
          <p className="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">
            {account.type}{" "}
            {account.institution ? `· ${account.institution}` : ""}
          </p>
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {formatMoney(account.balance, account.currency)}
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
        <h2 className="border-b border-gray-100 dark:border-gray-700 px-6 py-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent transactions
        </h2>
        {recentTransactions.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
            No transactions for this account yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Description</th>
                <th className="px-6 py-2">Category</th>
                <th className="px-6 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {formatDate(t.date, dateFormat)}
                  </td>
                  <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                    {t.description || "—"}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {t.category?.name ||
                      (t.type === "transfer" ? "Transfer" : "—")}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${t.type === "income" ? "text-green-600 dark:text-green-400" : t.type === "expense" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t.type === "income" && (
                        <TrendingUp className="h-3.5 w-3.5" />
                      )}
                      {t.type === "expense" && (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {t.type === "income"
                        ? "+"
                        : t.type === "expense"
                          ? "-"
                          : ""}
                      {formatMoney(t.amount, account.currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
