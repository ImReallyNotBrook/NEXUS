# Development status

Updated: 2026-11-14

## Completed
- Empty NEXUS repository inspected and confirmed.
- Product constraints, safety boundaries and architecture baseline documented.
- TypeScript/Vite project skeleton added.
- First mobile-first command-centre screen added.
- Strategy qualification rule implemented: 90 qualifying days AND 1,000 completed trades.
- Validated OHLCV candle domain model with strict timestamp ordering and OHLC/volume validation.
- Keyless Binance public spot OHLCV adapter; excludes incomplete candles and validates payloads.
- Deterministic SMA, EMA, Wilder RSI, Wilder ATR, MACD and Bollinger Bands.
- Dashboard BTC/USDT public market snapshot with RSI(14) and manual refresh.
- Deterministic long-only spot backtest engine with next-bar-open fills, configurable fees, adverse slippage, allocation sizing, trade ledger and marked-to-market equity curve.
- Qualification result only grants review eligibility; live execution is hard-coded false.
- Vitest specifications added for qualification, OHLCV validation, indicators, public adapter and backtest scenarios.
- PWA manifest, icon and static-shell service worker added.
- GitHub Actions workflow configured for tests and production build.

## Verification
- Local Node.js test harness: 5 qualification assertions passed.
- Local Node.js test harness: 15 candle/indicator assertions passed.
- Local Node.js test harness: 8 public market adapter assertions passed.
- Local Node.js test harness: 5 backtest scenario assertions passed.
- Global TypeScript 5.8.3 strict compile of candle, indicator, adapter and backtest modules: passed.
- Vitest specifications added for qualification, candle validation, indicators and Binance adapter; the full Vitest suite is still pending because GitHub Actions runners are failing before job steps execute.
- GitHub Actions: runs are created but fail before any runner starts (runner name empty; zero steps executed). The CI suite and production build therefore remain unverified in GitHub Actions.
- Full Vite production build and Vitest suite have not yet been run in a dependency-installed project environment.

## Current limitations
- Live endpoint connectivity has not been verified; the public Binance adapter is implemented and the dashboard attempts a public snapshot.
- No persistent backend or cloud database.
- No deployment configured or claimed.
- No live trading or exchange private credentials.
- CI runner availability must be resolved before relying on automated GitHub verification.

## Next implementation tasks
1. Resolve GitHub Actions runner execution and run the full Vitest/build pipeline.
2. Add historical candle pagination/backfill with provider-specific rate and retention limits.
3. Add spread, partial-fill and market-impact models plus out-of-sample backtest reporting.
4. Add automated data-quality monitoring and a visible feed-health history.

## Paper trading increment

- Added a deterministic BTC/USDT spot paper broker with a 10,000 USDT default simulated balance.
- Added adverse slippage, two-sided fees, fee-inclusive entry cost basis, per-symbol exposure limits, daily drawdown controls, and a fill ledger.
- Daily drawdown lock blocks new buys but explicitly permits sells to reduce risk.
- Added local IndexedDB persistence for the paper account and a dashboard order desk. Risk settings are frozen into each account snapshot; repeated clicks are serialized; account state is updated in memory only after a successful persistence transaction.
- Added 10 paper broker and 2 IndexedDB adapter Vitest specifications. Separate local Node harnesses passed 9 paper broker scenarios and 4 persistence assertions; strict TypeScript compilation passed for the paper broker and IndexedDB adapter modules.
- Full repository Vitest and Vite production build remain unverified because GitHub Actions jobs are failing before runner allocation (runner ID 0, empty runner name, no job steps). The latest workflow run must be checked again after this commit.
- IndexedDB browser integration and the full mobile UI have not yet been exercised in a real browser.
- Market orders use the latest completed candle close as a reference; the dashboard rejects orders when its fetched snapshot is older than five minutes. Spread, order-book depth, latency, partial fills, and market impact are not modelled.


## Deployment preparation

- Added a GitHub Pages deployment workflow gated by the complete test suite and production build.
- Deployment is not live or verified. GitHub Pages must be set to use GitHub Actions once in repository Settings → Pages; the available GitHub connection cannot change that setting.
- Current GitHub Actions runs continue to fail before hosted runner allocation, with runner ID 0 and no steps executed. This blocks both CI verification and deployment; no paid runner or hosting resource has been created.

## Provider-neutral market data increment

- Added a provider-neutral market snapshot contract and ordered provider resolver with strict shared OHLCV validation.
- Added independent public Kraken hourly OHLC fallback for BTC/USD and BTC/USDT. The current uncommitted Kraken row is excluded; unsupported pairs/intervals fail closed.
- Added version-2 IndexedDB market snapshot cache, keyed by symbol and interval, sharing the paper-account database.
- Resolver uses cache only after all providers fail, rejects cache entries older than 24 hours or with future timestamps, and marks cache fallback stale. The dashboard identifies the source and blocks paper orders for stale data.
- Local strict TypeScript compilation passed for the provider resolver, Kraken adapter and IndexedDB cache. Local deterministic harness passed 4 resolver assertions, 3 Kraken adapter assertions and 4 IndexedDB cache assertions.
- Added 5 market resolver, 4 Kraken adapter and 2 cache Vitest specifications. The repository Vitest suite and production build remain unverified because GitHub-hosted runner allocation has been failing before steps execute.
- No live API connectivity or Android browser integration has been claimed; public endpoint behavior still requires a real browser/device test.


## Market data quality increment

- Added snapshot quality diagnostics for invalid OHLCV, empty feeds, missing hourly intervals, invalid/future/stale fetch timestamps, incomplete latest candles, stale last-completed candles and zero-volume warnings. Gaps and stale/invalid snapshots fail the quality gate; zero-volume candles warn without being rewritten.
- Added timestamp-aligned Binance/Kraken close-price comparison using symmetric midpoint basis-point deviation. Feeds are never merged or averaged; deviations above 50 bps are flagged.
- Paper orders now require a quality-passing snapshot and a successful within-tolerance cross-provider check. A missing secondary feed, insufficient timestamp overlap, stale cache, candle gap or >50 bps discrepancy blocks orders.
- Provider resolution now enforces a configurable minimum candle count and fails over when a source returns insufficient history. The BTC dashboard requires at least 15 candles before accepting a provider response.
- Added 12 Vitest specifications for market-data quality/comparison and one resolver test for minimum-history failover. Cross-feed confirmation requires the latest candle timestamp to match, not merely older overlap. Local strict TypeScript compilation passed for the quality module; deterministic Node harnesses passed 12 quality/comparison assertions and 2 minimum-history resolver assertions.
- The Vitest suite and production build remain unverified. GitHub Actions runner allocation and Android browser/device integration are still outstanding; no live endpoint or deployment success is claimed.

## Market-data integrity follow-up

- Centralized IndexedDB schema creation in `src/adapters/nexus-database.ts` (version 2). Paper-account and market-cache adapters now use the same schema owner and close connections on version changes.
- Added regression specifications for both stores existing in the shared schema and concurrent opens.
- Added a market-quality rule and regression specification rejecting candle timestamps not aligned to the requested UTC interval.
- Local verification: strict TypeScript compilation passed for the shared database and both persistence adapters; an in-memory IndexedDB integration harness passed paper-account round-trip, market-cache round-trip and shared schema-version checks; a separate quality harness passed aligned/misaligned timestamp scenarios.
- Full Vitest and browser IndexedDB verification remain pending because the repository's GitHub Actions runner is not allocating a hosted runner.

## Walk-forward validation increment

- Added an expanding/rolling chronological fold generator with fixed out-of-sample test windows, configurable step size and embargo bars.
- Training, embargo and test segments are disjoint and ordered; only complete test windows are emitted. Input candles are validated and returned fold arrays/candle objects are frozen.
- Added 4 Vitest specifications covering expanding windows, rolling windows, invalid/short inputs, and immutability.
- Local TypeScript strict compilation passed for the fold generator. A deterministic Node harness passed 12 assertions.
- The fold generator partitions data only; strategy selection, parameter tuning, fold-level backtests and untouched final holdout evaluation remain future work. It does not eliminate data snooping, survivorship bias or regime shift.
- Full Vitest suite and production build remain unverified while GitHub Actions jobs fail before runner allocation.

- Walk-forward follow-up: added a regression check rejecting `stepBars < testBars`; overlapping out-of-sample windows would otherwise reuse test observations and overstate the number of independent evaluation windows. Local strict TypeScript compile passed and the updated deterministic harness passed 13 assertions.
