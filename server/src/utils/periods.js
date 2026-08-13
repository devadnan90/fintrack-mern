function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}
export function currentPeriodRange(period, reference = new Date()) {
  if (period === "weekly") {
    const start = startOfWeek(reference);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      start,
      end,
    };
  }
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return {
    start,
    end,
  };
}
export function previousPeriodRange(period, reference = new Date()) {
  if (period === "weekly") {
    const { start: curStart } = currentPeriodRange(period, reference);
    const start = new Date(curStart);
    start.setDate(start.getDate() - 7);
    return {
      start,
      end: curStart,
    };
  }
  const { start: curStart } = currentPeriodRange(period, reference);
  const start = new Date(curStart.getFullYear(), curStart.getMonth() - 1, 1);
  return {
    start,
    end: curStart,
  };
}
