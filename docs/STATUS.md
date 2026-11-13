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
1. Resolve GitHub Actions runner allocation and run the full Vitest/build pipeline.
2. Expose historical backfill and candle-history inspection in the mobile dashboard, with bounded progress and resumable requests.
3. Add spread, partial-fill and market-impact execution models; add parameter-search trial accounting and a final untouched holdout.
4. Build the research evidence ledger and hybrid skill-proposal workflow, keeping policy and risk changes behind human approval.

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

## Walk-forward backtest integration

- Added `evaluateWalkForward`: each fold's strategy factory receives training candles only, then its returned evaluator is run against that fold's subsequent test candles using the existing next-open-fill backtester, fees, slippage and position sizing.
- Reports per-fold results plus mean fold return, sequentially compounded fold return, worst fold drawdown, completed trade count, total fees and trade-weighted win rate.
- Added 3 Vitest specifications for training/test separation, aggregate metrics and invalid strategy factories.
- Local strict TypeScript compilation passed for candles, backtest, fold generation and evaluation modules. A deterministic Node integration harness passed 10 assertions.
- The evaluation uses independent capital resets per test fold; compounded return is a summary, not a continuous pooled-account simulation. It remains long-only spot and does not model funding, borrow, partial fills, market impact, or cross-asset concurrency.
- GitHub Actions remains blocked before runner allocation. No hosted Vitest run, production build or deployment is claimed.

## Historical market-data storage increment

- Added bounded sequential Binance historical pagination using start/end timestamps, fixed-duration interval cursors, duplicate/non-progress protection and a hard per-call candle budget. Calendar-month pagination is excluded because month lengths vary; HTTP/rate-limit failures surface without retry loops.
- Added a dedicated IndexedDB historical candle store partitioned by symbol, interval and provider, with indexed series reads, timestamp upserts and inclusive time-range filtering.
- Upgraded the single shared IndexedDB schema to version 3, creating paper accounts, latest market snapshots and historical candles together.
- Added 4 Binance history pagination specifications, 4 candle-history store specifications and expanded shared-schema tests.
- Local verification: strict TypeScript compile passed for the shared database, paper-account store, market-snapshot cache and candle-history store. Deterministic Node harnesses passed 4 backfill scenarios and candle-history append/range/series-isolation checks.
- The backfill and storage functions are not yet exposed in a dashboard workflow. Full Vitest, Vite build, and real browser IndexedDB testing remain blocked/unverified.

## Walk-forward out-of-sample execution increment

- Extended the backtest engine with warm-up bars that provide historical indicator context but cannot generate/fill trades and are excluded from OOS equity curves.
- Added `runWalkForwardBacktest`: a fresh strategy factory receives only each fold's training candles; embargo and training bars are warm-up only; each disjoint test window is independently backtested with a reset initial capital.
- Reports per-fold results, mean/median/worst/best fold return, maximum fold drawdown, total fees/trades and pooled win rate. Fold returns are not compounded or presented as a single portfolio return.
- Added a warm-up isolation test and 2 walk-forward runner specifications. Local strict TypeScript compile passed for backtest and walk-forward modules; deterministic harness passed warm-up isolation and 3 independent OOS fold scenarios.
- This is an evaluation framework, not an optimizer. Strategy selection and parameter search, multiple-testing accounting, and an untouched final holdout remain future work; walk-forward alone does not eliminate overfitting or regime shift.
- Full Vitest/build and hosted browser verification remain unverified because GitHub Actions still fails before runner allocation.

- Additional local verification after the warm-up edge-case fix: strict TypeScript compilation passed; deterministic walk-forward harness passed warm-up isolation, invalid empty-dataset warm-up rejection and three independent out-of-sample folds.

## Hybrid AI skill system increment

- Added six original agent skills for quant research, strategy engineering, backtest auditing, risk governance, skill evolution and market-data quality under `.agents/skills/`.
- Added evidence notes on supervised adaptive model training and an open-source reuse/licence audit. FreqAI's chronological retraining, versioned artifacts, warm-up and backtest replay are treated as design references only; no GPL code is copied.
- Added a hybrid learning/skill-governance policy: evidence-backed knowledge notes are the only potential auto-promotion scope; methodology, code, system, risk, qualification and execution changes require human approval.
- Added a typed governance module and 9 Vitest specifications for semantic version progression, evidence, score improvement, regression checks, changed-file classification, path traversal, immutable promotion and human approval.
- Local strict TypeScript compilation passed for the governance module; a deterministic Node harness passed 7 governance scenarios.
- This is an instruction and proposal framework, not an on-device LLM or self-training model. No model API or paid inference service is connected. Automatic promotion remains operationally disabled until a trusted evaluation runner and full CI suite are verified.


## Out-of-sample strategy scorecard increment

- Added a scorecard for chronological walk-forward evaluation: positive-fold share, mean/median/best/worst fold returns, fold-return dispersion, worst fold drawdown, completed-trade win rate, gross profit/loss, profit factor, net expectancy and fees.
- Profit factor is null when no losing trades exist; trade metrics are null when no completed trades exist. Open positions are excluded from completed-trade statistics. Fee-inclusive net PnL is not charged a second time.
- Added 4 Vitest specifications covering ordinary results, no-loss samples, no-trade samples and malformed trade values.
- Local strict TypeScript compilation passed for the scorecard and its backtest/walk-forward dependencies. A deterministic Node harness passed 12 assertions.
- This scorecard does not claim statistical significance or produce Sharpe/Sortino without a defined periodic return series and risk-free-rate convention. It does not remove multiple-testing, survivorship, market-impact or regime-shift risks.
- Full Vitest, production build, hosted CI and deployment remain unverified while GitHub Actions runner allocation is blocked by the account's failed payment authorization warning; no billing changes have been made.
