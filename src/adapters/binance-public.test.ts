import { describe, expect, it, vi } from "vitest";
import { fetchBinanceCandles } from "./binance-public";

const closed = [0, "100", "110", "90", "105", "12.5", 59_999, "0", 4, "100", "1250", "0"];
const open = [60_000, "105", "112", "101", "108", "9", 119_999, "0", 3, "100", "972", "0"];

describe("fetchBinanceCandles", () => {
  it("requests public spot klines and excludes the currently open candle", async () => {
    let requestedUrl: URL | undefined;
    const fetcher: typeof fetch = async (input) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify([closed, open]), { status: 200 });
    };

    const result = await fetchBinanceCandles(
      { symbol: "btcusdt", interval: "1m", limit: 100 },
      fetcher,
      60_000,
    );

    expect(result).toEqual([{
      timestamp: 0, open: 100, high: 110, low: 90, close: 105, volume: 12.5,
    }]);
    expect(requestedUrl?.hostname).toBe("data-api.binance.vision");
    expect(requestedUrl?.searchParams.get("symbol")).toBe("BTCUSDT");
    expect(requestedUrl?.searchParams.get("interval")).toBe("1m");
    expect(requestedUrl?.searchParams.get("limit")).toBe("100");
  });

  it("rejects invalid symbol, interval and limit before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchBinanceCandles({ symbol: "BTC/USDT", interval: "1m" }, fetcher)).rejects.toThrow(/symbol/);
    await expect(fetchBinanceCandles({ symbol: "BTCUSDT", interval: "2m" as "1m" }, fetcher)).rejects.toThrow(/interval/);
    await expect(fetchBinanceCandles({ symbol: "BTCUSDT", interval: "1m", limit: 1001 }, fetcher)).rejects.toThrow(/limit/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects malformed rows and invalid OHLC values", async () => {
    const malformed: typeof fetch = async () => new Response(JSON.stringify([[1, "1"]]), { status: 200 });
    await expect(fetchBinanceCandles({ symbol: "BTCUSDT", interval: "1m" }, malformed, 100_000)).rejects.toThrow(/malformed/);

    const invalidOhlc = [0, "100", "99", "90", "105", "1", 59_999];
    const invalid: typeof fetch = async () => new Response(JSON.stringify([invalidOhlc]), { status: 200 });
    await expect(fetchBinanceCandles({ symbol: "BTCUSDT", interval: "1m" }, invalid, 60_000)).rejects.toThrow(/OHLC/);
  });

  it("surfaces HTTP errors without treating them as empty market data", async () => {
    const failing: typeof fetch = async () => new Response("rate limited", { status: 429 });
    await expect(fetchBinanceCandles({ symbol: "BTCUSDT", interval: "1m" }, failing, 60_000)).rejects.toThrow(/HTTP 429/);
  });
});
