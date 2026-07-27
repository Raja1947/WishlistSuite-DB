// Free, keyless exchange-rate lookup (open.er-api.com). Fetches ALL USD rates
// in a single call so every shop's revenue can be converted in one round-trip,
// no matter how many distinct currencies are present. Pages that use this
// already set `export const revalidate = 300`, so this only actually runs
// once per 5-minute ISR regeneration — no extra caching layer needed.
type UsdRatesResponse = { result: string; rates?: Record<string, number> };

export async function getUsdRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    const data: UsdRatesResponse = await res.json();
    if (data.result !== "success" || !data.rates) {
      console.error("[currency] Exchange rate API returned an error:", data);
      return {};
    }
    return data.rates;
  } catch (err) {
    console.error("[currency] Failed to fetch USD exchange rates:", err);
    return {};
  }
}

// `rates` maps currencyCode -> (1 USD in that currency), so converting a
// native amount to USD means dividing by the rate. Falls back to the raw
// amount if the rate lookup failed or the currency is unknown, so a bad
// API call never breaks a page.
export function toUsd(amount: number, currencyCode: string | null | undefined, rates: Record<string, number>): number {
  const value = Number(amount) || 0;
  if (!currencyCode || currencyCode === "USD") return value;
  const rate = rates[currencyCode];
  if (!rate) return value;
  return value / rate;
}
