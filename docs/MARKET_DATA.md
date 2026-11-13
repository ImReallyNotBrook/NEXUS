# Market data architecture

## Provider-neutral contract

The domain service consumes `MarketDataProvider` implementations and returns a `MarketSnapshot` containing the normalized market, interval, source, fetch time, stale flag and validated OHLCV candles. Indicators and strategies should depend on this contract, not a provider SDK or response schema.

## Independent public sources

- **Binance public spot klines:** primary BTC/USDT hourly feed. It filters the currently open candle using the provider close time.
- **Kraken public OHLC:** independent fallback for BTC/USDT hourly data. Kraken's final row is excluded because its API identifies that row as the current, uncommitted interval. The first implementation deliberately supports only BTC/USD and BTC/USDT at 1h; unsupported pairs and intervals fail closed.

Both adapters use public endpoints and require no API key. A provider response is validated by the shared OHLCV validator. Malformed or non-monotonic data is rejected and causes the resolver to try the next provider.

## Resolution and fallback policy

1. Try providers in declared priority order.
2. Validate the first successful response and cache it locally.
3. If every provider fails, load the matching symbol/interval cache entry.
4. Cached data is accepted only when its fetch time is not in the future and it is no older than 24 hours.
5. Cache fallback is explicitly marked stale. The dashboard displays the source and stale state; paper orders are disabled whenever the snapshot is stale.
6. A configurable minimum candle count is enforced during provider resolution. A short response is treated as provider failure and the next source is tried.
7. If no valid fresh provider response or eligible cache entry exists, return an error. There is no silent synthetic price or empty-series substitution.

A local cache write failure does not invalidate a fresh provider response. Cache read failure does not create data; the market request fails visibly.

## Local persistence

Market snapshots share the versioned `nexus-local` IndexedDB database with paper accounts. Schema version 2 adds the `marketSnapshots` object store. Cache keys are symbol plus interval, so BTC/USD hourly data cannot overwrite BTC/USDT or another timeframe.

The cache is device-local, not a cloud backup. Browser data clearing or eviction can remove it. Paper-account and market-snapshot adapters use one shared schema owner and database version, which creates both object stores in the same upgrade transaction and closes old connections on version changes.

## Data-quality and research limits

- OHLCV timestamps are milliseconds in the domain model.
- Candles must be strictly increasing and each open timestamp must align to the UTC interval boundary; the system does not sort, shift or repair bad provider data.
- No currently open candle is passed to indicators or backtests.
- Provider timestamps and candle close timestamps are distinct: `fetchedAt` records when NEXUS retrieved the snapshot; each candle timestamp identifies its open time.
- Cross-provider prices are not blindly merged. Different venues have different liquidity, volume conventions, pair availability and market microstructure.
- The quality gate checks candle ordering/OHLC validity, exact interval continuity, snapshot fetch-time validity and age, and the latest candle close boundary. An unclosed last candle fails; a last completed candle older than one full interval plus the freshness grace fails. Missing intervals fail; zero-volume candles warn but are not silently discarded.
- Binance and Kraken hourly closes are compared only at identical candle timestamps, and both feeds must contain the same latest candle timestamp. Older overlap alone is insufficient. The dashboard flags deviations above 50 bps; it does not average or substitute prices.
- Paper orders require a fresh quality-passing snapshot and a successful within-tolerance cross-provider comparison. A missing second feed, insufficient overlap or discrepancy blocks paper orders.
- The dashboard still uses hourly snapshots and manual refresh. It is not a tick feed or a trading-grade execution quote.

## Indicator conventions

- SMA: trailing arithmetic mean.
- EMA: first period-sized SMA is the seed; alpha = 2 / (period + 1).
- RSI: Wilder smoothing; initial average gain/loss over period changes; flat series returns 50.
- ATR: Wilder smoothing; first true range is high minus low.
- MACD: EMA(fast) minus EMA(slow); signal is EMA of the valid MACD line.
- Bollinger Bands: trailing SMA plus/minus the configured number of population standard deviations.

All series preserve input length and use null during warm-up. Values are deterministic and do not inspect future observations.
