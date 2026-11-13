import { validateCandles, type Candle } from "./candles";

export type BacktestSignal = "buy" | "sell" | "hold";
export type StrategyEvaluator = (history: readonly Candle[]) => BacktestSignal;

export interface BacktestConfig {
  initialCapital: number;
  feeRate: number;
  slippageBps: number;
  allocationFraction: number;
}

export interface BacktestTrade {
  entryTimestamp: number;
  exitTimestamp: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryFee: number;
  exitFee: number;
  pnl: number;
  pnlPct: number;
}

export interface BacktestPosition {
  entryTimestamp: number;
  entryPrice: number;
  quantity: number;
  entryFee: number;
  entryCost: number;
}

export interface BacktestResult {
  startingCapital: number;
  endingEquity: number;
  cash: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  completedTrades: number;
  winRatePct: number;
  totalFees: number;
  trades: BacktestTrade[];
  equityCurve: Array<{ timestamp: number; equity: number; cash: number; positionValue: number }>;
  openPosition: BacktestPosition | null;
}

export function runBacktest(
  inputCandles: readonly Candle[],
  evaluate: StrategyEvaluator,
  config: BacktestConfig,
): BacktestResult {
  const { initialCapital, feeRate, slippageBps, allocationFraction } = config;
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) throw new RangeError("initialCapital must be positive");
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 1) throw new RangeError("feeRate must be in [0, 1)");
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) throw new RangeError("slippageBps must be in [0, 10000)");
  if (!Number.isFinite(allocationFraction) || allocationFraction <= 0 || allocationFraction > 1) throw new RangeError("allocationFraction must be in (0, 1]");

  const candles = validateCandles(inputCandles);
  if (candles.some((candle) => candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0)) {
    throw new RangeError("Spot backtests require strictly positive OHLC prices");
  }

  let cash = initialCapital;
  let position: BacktestPosition | null = null;
  let pending: BacktestSignal = "hold";
  let totalFees = 0;
  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestResult["equityCurve"] = [];
  const slippage = slippageBps / 10_000;

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];

    // Orders generated at the previous close fill at this candle's open.
    if (pending === "buy" && position === null) {
      const fillPrice = candle.open * (1 + slippage);
      const budget = Math.min(cash, cash * allocationFraction);
      const quantity = budget / (fillPrice * (1 + feeRate));
      if (quantity > 0 && Number.isFinite(quantity)) {
        const notional = quantity * fillPrice;
        const fee = notional * feeRate;
        const entryCost = notional + fee;
        cash -= entryCost;
        totalFees += fee;
        position = { entryTimestamp: candle.timestamp, entryPrice: fillPrice, quantity, entryFee: fee, entryCost };
      }
    } else if (pending === "sell" && position !== null) {
      const fillPrice = candle.open * (1 - slippage);
      const notional = position.quantity * fillPrice;
      const exitFee = notional * feeRate;
      const pnl = notional - exitFee - position.entryCost;
      cash += notional - exitFee;
      totalFees += exitFee;
      trades.push({
        entryTimestamp: position.entryTimestamp,
        exitTimestamp: candle.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: fillPrice,
        quantity: position.quantity,
        entryFee: position.entryFee,
        exitFee,
        pnl,
        pnlPct: (pnl / position.entryCost) * 100,
      });
      position = null;
    }
    pending = "hold";

    const positionValue = position ? position.quantity * candle.close : 0;
    const equity = cash + positionValue;
    equityCurve.push({ timestamp: candle.timestamp, equity, cash, positionValue });

    // The strategy receives only candles through the current close; future bars are inaccessible.
    const history = candles.slice(0, i + 1).map((item) => Object.freeze({ ...item }));
    const signal = evaluate(Object.freeze(history));
    if (signal !== "buy" && signal !== "sell" && signal !== "hold") {
      throw new TypeError("Strategy returned an invalid signal");
    }
    pending = signal;
  }

  const endingEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  let peak = initialCapital;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, ((peak - point.equity) / peak) * 100);
  }
  const winners = trades.filter((trade) => trade.pnl > 0).length;

  return {
    startingCapital: initialCapital,
    endingEquity,
    cash,
    totalReturnPct: ((endingEquity - initialCapital) / initialCapital) * 100,
    maxDrawdownPct,
    completedTrades: trades.length,
    winRatePct: trades.length ? (winners / trades.length) * 100 : 0,
    totalFees,
    trades,
    equityCurve,
    openPosition: position,
  };
}
