import { validateCandles, type Candle } from "../domain/candles";

export const BINANCE_PUBLIC_DATA_URL = "https://data-api.binance.vision/api/v3/klines";

export const BINANCE_INTERVALS = [
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w", "1M",
] as const;

export type BinanceInterval = (typeof BINANCE_INTERVALS)[number];

export interface BinanceCandleRequest {
  symbol: string;
  interval: BinanceInterval;
  limit?: number;
  endTime?: number;
}

type BinanceKlineRow = unknown[];

function parseNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError("Binance returned invalid " + field);
  return parsed;
}

/**
 * Fetches public spot OHLCV only. No API key or private account permission is used.
 * Open candles are excluded so callers never backtest against a candle that has not closed.
 */
export async function fetchBinanceCandles(
  request: BinanceCandleRequest,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<Candle[]> {
  const symbol = request.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) throw new RangeError("symbol must be a valid alphanumeric market pair");
  if (!BINANCE_INTERVALS.includes(request.interval)) throw new RangeError("Unsupported Binance candle interval");
  const limit = request.limit ?? 500;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new RangeError("limit must be an integer between 1 and 1000");
  }
  if (!Number.isSafeInteger(now) || now < 0) throw new RangeError("now must be a non-negative timestamp");

  const url = new URL(BINANCE_PUBLIC_DATA_URL);
  url.search = new URLSearchParams({
    symbol,
    interval: request.interval,
    limit: String(limit),
    ...(request.endTime === undefined ? {} : { endTime: String(request.endTime) }),
  }).toString();

  const response = await fetcher(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Binance public market data request failed: HTTP " + response.status);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new TypeError("Binance returned an invalid candle payload");

  const candles: Candle[] = [];
  for (const raw of payload as BinanceKlineRow[]) {
    if (!Array.isArray(raw) || raw.length < 7) {
      throw new TypeError("Binance returned a malformed kline row");
    }
    const timestamp = parseNumber(raw[0], "open time");
    const closeTime = parseNumber(raw[6], "close time");
    if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(closeTime) || closeTime < timestamp) {
      throw new RangeError("Binance returned invalid candle timestamps");
    }
    if (closeTime > now) continue;

    candles.push({
      timestamp,
      open: parseNumber(raw[1], "open"),
      high: parseNumber(raw[2], "high"),
      low: parseNumber(raw[3], "low"),
      close: parseNumber(raw[4], "close"),
      volume: parseNumber(raw[5], "volume"),
    });
  }

  return validateCandles(candles);
}
