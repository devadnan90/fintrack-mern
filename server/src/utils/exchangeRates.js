const FRANKFURTER_URL = "https://api.frankfurter.app/latest";
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = {
  base: null,
  rates: null,
  fetchedAt: 0,
};
export async function getRates(base = "USD") {
  const isFresh =
    cache.base === base && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cache.rates;
  const res = await fetch(
    `${FRANKFURTER_URL}?from=${encodeURIComponent(base)}`,
  );
  if (!res.ok) {
    throw new Error(`Exchange rate provider returned ${res.status}`);
  }
  const data = await res.json();
  const rates = {
    ...data.rates,
    [base]: 1,
  };
  cache = {
    base,
    rates,
    fetchedAt: Date.now(),
  };
  return rates;
}
export function convertCents(cents, from, to, rates) {
  if (from === to) return cents;
  const rate = rates[to];
  if (!rate) return null;
  return Math.round(cents * rate);
}
