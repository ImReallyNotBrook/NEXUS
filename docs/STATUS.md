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
2. Add provider-neutral market data interfaces, IndexedDB caching and stale-data metadata.
3. Add a second public data source for cross-provider validation.
4. Extend backtests with spread, partial-fill and market-impact models plus out-of-sample reporting.
5. Add local persistence and a paper broker ledger with independent risk checks.

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
