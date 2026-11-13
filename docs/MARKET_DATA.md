# Public crypto market-data adapter

## Provider
The first adapter uses Binance's public market-data endpoint:
- Host: data-api.binance.vision
- Endpoint: GET /api/v3/klines
- Authentication: none
- Scope: public spot OHLCV only; no account, balance, order or trading endpoints.

## Contract
The adapter accepts a symbol, an allow-listed interval, a limit from 1 to 1,000 and an optional non-negative safe-integer endTime. It normalizes the symbol to uppercase, validates the response shape and numeric fields, and passes resulting candles through the shared OHLCV validator.

Candles are returned in provider order. Duplicate or descending timestamps are rejected rather than silently sorted. The currently open candle is excluded using its provider close-time field and the supplied/current clock.

## Indicator conventions
- SMA: trailing arithmetic mean.
- EMA: first period-sized SMA is the seed; alpha = 2 / (period + 1).
- RSI: Wilder smoothing; initial average gain/loss over period changes; flat series returns 50.
- ATR: Wilder smoothing; first true range is high minus low.
- MACD: EMA(fast) minus EMA(slow); signal is EMA of the valid MACD line.
- Bollinger Bands: trailing SMA plus/minus the configured number of population standard deviations.

All series preserve input length and use null during warm-up. Values are deterministic and do not inspect future observations.

## Operational limits
Public endpoints are rate-limited and may be unavailable or geographically restricted. HTTP errors are surfaced to the caller; there is no retry storm or hidden fallback. The dashboard loads a single BTC/USDT hourly snapshot on startup and supports manual refresh. It does not place orders.

## Next
Add a provider-neutral interface, local IndexedDB candle cache, explicit stale-data metadata, and a second independently sourced feed before using market data for cross-provider validation.
