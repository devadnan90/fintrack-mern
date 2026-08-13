export function toCents(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) throw new Error("Amount must be a number");
  return Math.round(n * 100);
}
export function fromCents(cents) {
  return Math.round(cents) / 100;
}
