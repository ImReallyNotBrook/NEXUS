import { validateCandles, type Candle } from "./candles";
import { buildRegimeScorecard, type MarketRegimeConfig, type RegimeScorecard } from "./market-regimes";
import { buildStrategyScorecard, type StrategyScorecard } from "./strategy-scorecard";
import {
  evaluateWalkForward,
  type StrategyFactory,
  type WalkForwardEvaluationConfig,
  type WalkForwardEvaluationResult,
} from "./walk-forward-evaluation";

export interface ResearchCandidate {
  /** Stable, unique identifier; use a new ID when strategy logic or parameters change. */
  id: string;
  name: string;
  /** Factory is called independently for every training fold. */
  fit: StrategyFactory;
}

export interface ResearchPipelineConfig {
  folds: WalkForwardEvaluationConfig["folds"];
  backtest: WalkForwardEvaluationConfig["backtest"];
  regime: MarketRegimeConfig;
}

export interface ResearchCandidateResult {
  id: string;
  name: string;
  evaluation: WalkForwardEvaluationResult;
  scorecard: StrategyScorecard;
  regimeScorecard: RegimeScorecard;
}

export interface ResearchBatchResult {
  dataset: {
    candleCount: number;
    firstTimestamp: number;
    lastTimestamp: number;
  };
  config: ResearchPipelineConfig;
  candidateResults: ResearchCandidateResult[];
}

/**
 * Runs every candidate against the same chronological folds and execution
 * assumptions. It deliberately does not rank, select, tune, promote or execute
 * candidates. The caller must version candidate IDs when code/parameters change.
 */
export function runResearchBatch(
  inputCandles: readonly Candle[],
  candidates: readonly ResearchCandidate[],
  config: ResearchPipelineConfig,
): ResearchBatchResult {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new RangeError("At least one research candidate is required");
  }

  const candles = validateCandles(inputCandles);
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
      throw new TypeError("Every candidate requires a non-empty stable ID");
    }
    if (ids.has(candidate.id)) throw new RangeError("Candidate IDs must be unique within a research batch");
    ids.add(candidate.id);
    if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
      throw new TypeError("Every candidate requires a non-empty name");
    }
    if (typeof candidate.fit !== "function") throw new TypeError("Every candidate requires a strategy factory");
  }

  const candidateResults = candidates.map((candidate): ResearchCandidateResult => {
    const evaluation = evaluateWalkForward(candles, {
      folds: config.folds,
      backtest: config.backtest,
      fit: candidate.fit,
    });
    return {
      id: candidate.id,
      name: candidate.name,
      evaluation,
      scorecard: buildStrategyScorecard(evaluation),
      regimeScorecard: buildRegimeScorecard(candles, evaluation, config.regime),
    };
  });

  return {
    dataset: {
      candleCount: candles.length,
      firstTimestamp: candles[0].timestamp,
      lastTimestamp: candles[candles.length - 1].timestamp,
    },
    config: {
      folds: { ...config.folds },
      backtest: { ...config.backtest },
      regime: { ...config.regime },
    },
    candidateResults,
  };
}
