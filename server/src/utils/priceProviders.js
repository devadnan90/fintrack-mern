const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS)
    return hit.priceUsdCents;
  return undefined;
}
function setCached(key, priceUsdCents) {
  cache.set(key, {
    priceUsdCents,
    fetchedAt: Date.now(),
  });
}
export async function getCryptoPriceCents(coingeckoId) {
  if (!coingeckoId) return null;
  const cacheKey = `crypto:${coingeckoId}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.[coingeckoId]?.usd;
    if (typeof price !== "number") return null;
    const cents = Math.round(price * 100);
    setCached(cacheKey, cents);
    return cents;
  } catch {
    return null;
  }
}
export async function getStockPriceCents(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!symbol || !apiKey) return null;
  const cacheKey = `stock:${symbol}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const price = Number(data?.["Global Quote"]?.["05. price"]);
    if (!price) return null;
    const cents = Math.round(price * 100);
    setCached(cacheKey, cents);
    return cents;
  } catch {
    return null;
  }
}
