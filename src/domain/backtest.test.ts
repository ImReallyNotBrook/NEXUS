import { describe, expect, it } from "vitest";
import { runBacktest, type BacktestSignal } from "./backtest";
import type { Candle } from "./candles";

const candles: Candle[] = [
  { timestamp: 1, open: 100, high: 102, low: 99, close: 101, volume: 10 },
  { timestamp: 2, open: 110, high: 121, low: 109, close: 120, volume: 10 },
  { timestamp: 3, open: 120, high: 131, low: 119, close: 130, volume: 10 },
  { timestamp: 4, open: 130, high: 131, low: 119, close: 120, volume: 10 },
];

describe("runBacktest", () => {
  it("executes a close signal at the next candle open, never the same close", () => {
    const seen: number[] = [];
    const result = runBacktest(candles, (history) => {
      seen.push(history.length);
      return history.length === 1 ? "buy" : "hold";
    }, { initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 0.5 });
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(result.openPosition?.entryPrice).toBe(110);
    expect(result.openPosition?.entryTimestamp).toBe(2);
    expect(result.completedTrades).toBe(0);
  });

  it("uses warm-up history without allowing pre-test signals or equity into the test result", () => {
    const series: Candle[] = [
      ...candles,
      { timestamp: 5, open: 120, high: 131, low: 119, close: 125, volume: 10 },
    ];
    const result = runBacktest(series, (history) =>
      history.length === 3 ? "buy" : history.length === 4 ? "sell" : "hold",
    { initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 0.5, warmupBars: 2 });
    expect(result.equityCurve.map((point) => point.timestamp)).toEqual([3, 4, 5]);
    expect(result.completedTrades).toBe(1);
    expect(result.trades[0].entryTimestamp).toBe(4);
    expect(result.trades[0].exitTimestamp).toBe(5);
  });

  it("rejects warm-up bars that consume an empty or complete dataset", () => {
    expect(() => runBacktest([], () => "hold", {
      initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 1, warmupBars: 1,
    })).toThrow(/warmupBars/i);
    expect(() => runBacktest(candles, () => "hold", {
      initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 1, warmupBars: candles.length,
    })).toThrow(/warmupBars/i);
  });

  it("applies fees and adverse slippage to both entry and exit", () => {
    const result = runBacktest(candles.slice(0, 3), (history) =>
      history.length === 1 ? "buy" : history.length === 2 ? "sell" : "hold",
    { initialCapital: 1000, feeRate: 0.001, slippageBps: 10, allocationFraction: 0.5 });
    expect(result.completedTrades).toBe(1);
    expect(result.trades[0].entryPrice).toBeCloseTo(110.11);
    expect(result.trades[0].exitPrice).toBeCloseTo(119.88);
    expect(result.trades[0].entryFee).toBeGreaterThan(0);
    expect(result.trades[0].exitFee).toBeGreaterThan(0);
    expect(result.trades[0].pnl).toBeGreaterThan(0);
  });

  it("does not execute a signal generated on the final candle", () => {
    const result = runBacktest(candles.slice(0, 1), () => "buy", {
      initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 1,
    });
    expect(result.completedTrades).toBe(0);
    expect(result.openPosition).toBeNull();
    expect(result.endingEquity).toBe(1000);
  });

  it("rejects invalid costs, sizing and non-positive spot prices", () => {
    expect(() => runBacktest(candles, () => "hold", { initialCapital: 0, feeRate: 0, slippageBps: 0, allocationFraction: 1 })).toThrow();
    expect(() => runBacktest(candles, () => "hold", { initialCapital: 1000, feeRate: 0, slippageBps: 10000, allocationFraction: 1 })).toThrow();
    expect(() => runBacktest([{ ...candles[0], close: 0 }], () => "hold", { initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 1 })).toThrow();
  });

  it("reports drawdown and keeps the open position marked to market", () => {
    const result = runBacktest(candles, (history): BacktestSignal =>
      history.length === 1 ? "buy" : "hold",
    { initialCapital: 1000, feeRate: 0, slippageBps: 0, allocationFraction: 0.5 });
    expect(result.equityCurve).toHaveLength(candles.length);
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(result.endingEquity).toBeCloseTo(result.cash + (result.openPosition?.quantity ?? 0) * 120);
  });
});
