export function formatMoney(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
export function formatDate(dateStr, dateFormat) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  if (!dateFormat) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  switch (dateFormat) {
    case "DMY":
      return `${dd}/${mm}/${yyyy}`;
    case "YMD":
      return `${yyyy}-${mm}-${dd}`;
    case "MDY":
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}
