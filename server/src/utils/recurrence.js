export function nextOccurrence(date, recurrence) {
  const d = new Date(date);
  switch (recurrence) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "monthly": {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      const daysInNextMonth = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();
      d.setDate(Math.min(day, daysInNextMonth));
      return d;
    }
    case "yearly": {
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    default:
      return null;
  }
}
