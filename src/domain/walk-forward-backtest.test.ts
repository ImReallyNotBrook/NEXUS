import { describe, expect, it } from "vitest";
import { runWalkForwardBacktest } from "./walk-forward-backtest";
import type { Candle } from "./candles";

const candles: Candle[] = Array.from({ length: 30 }, (_, index) => ({
  timestamp: index * 60_000,
  open: 100 + index,
  high: 103 + index,
  low: 99 + index,
  close: 102 + index,
  volume: 10,
}));

describe("runWalkForwardBacktest", () => {
  it("fits each fold using training-only data and reports disjoint out-of-sample results", () => {
    const trainingSizes: number[] = [];
    const result = runWalkForwardBacktest(
      candles,
      { trainBars: 10, testBars: 5, stepBars: 5, embargoBars: 2 },
      { initialCapital: 1_000, feeRate: 0.001, slippageBps: 5, allocationFraction: 0.5 },
      (training) => {
        trainingSizes.push(training.length);
        return (history) => history.length === training.length + 3
          ? "buy"
          : history.length === training.length + 4 ? "sell" : "hold";
      },
    );

    expect(result.folds).toHaveLength(3);
    expect(trainingSizes).toEqual([10, 15, 20]);
    expect(result.folds.every((fold) => fold.result.equityCurve.length === 5)).toBe(true);
    expect(result.folds.every((fold) => fold.result.completedTrades === 1)).toBe(true);
    expect(result.completedTrades).toBe(3);
    expect(result.meanFoldReturnPct).toBeGreaterThan(0);
    expect(result.worstFoldReturnPct).toBeLessThanOrEqual(result.bestFoldReturnPct);
  });

  it("rejects training strategies that return invalid signals during test", () => {
    expect(() => runWalkForwardBacktest(
      candles,
      { trainBars: 10, testBars: 5 },
      { initialCapital: 1_000, feeRate: 0, slippageBps: 0, allocationFraction: 0.5 },
      () => () => "long" as "buy",
    )).toThrow(/invalid signal/i);
  });
});
