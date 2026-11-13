import type { Candle } from "./candles";
import { buildWalkForwardFolds, type WalkForwardConfig } from "./walk-forward";
import { runBacktest, type BacktestConfig, type BacktestResult, type StrategyEvaluator } from "./backtest";

export type WalkForwardStrategyFactory = (
  trainingCandles: readonly Candle[],
  foldIndex: number,
) => StrategyEvaluator;

export interface WalkForwardFoldBacktest {
  index: number;
  trainStartTimestamp: number;
  trainEndTimestamp: number;
  testStartTimestamp: number;
  testEndTimestamp: number;
  trainingBars: number;
  embargoBars: number;
  testBars: number;
  result: BacktestResult;
}

export interface WalkForwardBacktestResult {
  folds: WalkForwardFoldBacktest[];
  completedTrades: number;
  winRatePct: number;
  totalFees: number;
  meanFoldReturnPct: number;
  medianFoldReturnPct: number;
  worstFoldReturnPct: number;
  bestFoldReturnPct: number;
  maxFoldDrawdownPct: number;
}

/**
 * Fits each fold's strategy using training data only, then simulates only its
 * disjoint test window. Training and embargo bars are available as indicator
 * context but are excluded from fills, equity curves and reported returns.
 *
 * Each fold starts with independent initial capital. Fold returns are reported
 * individually and as unweighted descriptive statistics, never compounded.
 */
export function runWalkForwardBacktest(
  candles: readonly Candle[],
  walkForwardConfig: WalkForwardConfig,
  backtestConfig: Omit<BacktestConfig, "warmupBars">,
  createStrategy: WalkForwardStrategyFactory,
): WalkForwardBacktestResult {
  const folds = buildWalkForwardFolds(candles, walkForwardConfig);
  const results: WalkForwardFoldBacktest[] = folds.map((fold) => {
    const strategy = createStrategy(fold.train, fold.index);
    if (typeof strategy !== "function") {
      throw new TypeError("Strategy factory must return an evaluator function");
    }
    const testSeries = [...fold.train, ...fold.embargo, ...fold.test];
    const result = runBacktest(testSeries, strategy, {
      ...backtestConfig,
      warmupBars: fold.train.length + fold.embargo.length,
    });
    return {
      index: fold.index,
      trainStartTimestamp: fold.train[0].timestamp,
      trainEndTimestamp: fold.train[fold.train.length - 1].timestamp,
      testStartTimestamp: fold.test[0].timestamp,
      testEndTimestamp: fold.test[fold.test.length - 1].timestamp,
      trainingBars: fold.train.length,
      embargoBars: fold.embargo.length,
      testBars: fold.test.length,
      result,
    };
  });

  const returns = results.map((fold) => fold.result.totalReturnPct);
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const middle = Math.floor(sortedReturns.length / 2);
  const medianFoldReturnPct = sortedReturns.length % 2 === 0
    ? (sortedReturns[middle - 1] + sortedReturns[middle]) / 2
    : sortedReturns[middle];
  const completedTrades = results.reduce((total, fold) => total + fold.result.completedTrades, 0);
  const winningTrades = results.reduce(
    (total, fold) => total + Math.round(fold.result.completedTrades * fold.result.winRatePct / 100),
    0,
  );

  return {
    folds: results,
    completedTrades,
    winRatePct: completedTrades ? winningTrades / completedTrades * 100 : 0,
    totalFees: results.reduce((total, fold) => total + fold.result.totalFees, 0),
    meanFoldReturnPct: returns.reduce((total, value) => total + value, 0) / returns.length,
    medianFoldReturnPct,
    worstFoldReturnPct: sortedReturns[0],
    bestFoldReturnPct: sortedReturns[sortedReturns.length - 1],
    maxFoldDrawdownPct: Math.max(...results.map((fold) => fold.result.maxDrawdownPct)),
  };
}
