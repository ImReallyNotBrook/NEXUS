# Reproducible strategy research pipeline

`runResearchBatch` runs a set of versioned strategy candidates against the same market history, walk-forward fold schedule, fee/slippage assumptions, sizing rules and regime configuration.

## Pipeline

1. Validate and snapshot the supplied OHLCV candle history.
2. Validate candidate IDs, names and strategy factories. IDs must be unique within the batch and should change whenever strategy code or parameters change.
3. For each candidate, call the existing walk-forward evaluator. Each fold invokes the candidate factory with training candles only, then evaluates the returned strategy on the subsequent test window. Embargo and training candles are context-only warm-up.
4. Build the aggregate out-of-sample scorecard and regime-specific trade scorecard.
5. Return per-fold ledgers, aggregate metrics, regime groups and the shared experiment configuration.

The baseline candidate catalog exposes SMA crossover, RSI mean reversion and Donchian breakout with explicit parameter sets. These are unoptimized reference strategies, not recommended or production strategies.

## Important controls

- All candidates in a batch use identical candles, fold boundaries and execution assumptions.
- The pipeline does not optimize, rank, select, promote or route orders. Candidate order in the result is input order, not a performance ranking.
- Factories are called separately for every training fold, so stateful evaluators must be created inside the factory, not shared between folds.
- Results are only comparable when data source, asset, interval, timestamps, fees, slippage, allocation and fold configuration match.
- Keep a final untouched holdout outside all strategy/parameter selection. Repeatedly inspecting walk-forward results can still create multiple-testing and human data-snooping bias.
- The current engine is long-only spot and does not model spread, order-book depth, partial fills, market impact, funding, borrow or portfolio-level concurrency.

## Example configuration

```ts
const candidates = createBaselineResearchCandidates({
  sma: { fastPeriod: 10, slowPeriod: 30 },
  rsi: { period: 14, oversold: 30, overbought: 70 },
  donchian: { period: 20 },
});

const report = runResearchBatch(candles, candidates, {
  folds: { trainBars: 720, testBars: 168, stepBars: 168, embargoBars: 2, expanding: true },
  backtest: {
    initialCapital: 10_000,
    feeRate: 0.001,
    slippageBps: 5,
    allocationFraction: 0.25,
  },
  regime: {
    fastEmaPeriod: 10,
    slowEmaPeriod: 30,
    atrPeriod: 14,
    trendThresholdPct: 0.15,
    lowVolatilityAtrPct: 1,
    highVolatilityAtrPct: 4,
  },
});
```

The values above are illustrative configuration only. They are not calibrated for BTC, any particular timeframe, or future profitability. Regime thresholds and strategy parameters must be selected within training data, not optimized against reported test outcomes.

## Status

This module is a deterministic research orchestration layer. It is not yet exposed in the dashboard, and no historical experiment has been run against a curated, quality-audited dataset. Do not interpret the code or sample configuration as evidence of an edge.
