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
- Qualification result only grants review eligibility; live execution is hard-coded false.
- Unit tests added for thresholds and invalid evidence.
- PWA manifest, icon and static-shell service worker added.
- GitHub Actions workflow configured for tests and production build.

## Verification
- Local Node.js test harness: 5 qualification assertions passed.
- Local Node.js test harness: 15 candle/indicator assertions passed.
- Local Node.js test harness: 8 public market adapter assertions passed.
- Global TypeScript 5.8.3 strict compile of candle, indicator and adapter modules: passed.
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
4. Build event-driven backtest core with fee, slippage, sizing and chronological safeguards.
5. Add local persistence and paper broker ledger.
