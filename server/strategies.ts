/**
 * Trading Strategy Definitions
 *
 * Strategy 1 — SNIPE LOW CAP
 *   Target:     MC $44K – $250K
 *   Take-profit: 30%  (close full position)
 *   Stop-loss:   10%
 *   Trade size:  60% of wallet balance (higher risk, higher reward)
 *   Rationale:  Low caps can move 30%+ quickly on momentum; exit fast.
 *
 * Strategy 2 — MID CAP 2X
 *   Target:     MC $250K – $2M
 *   Take-profit: 100% (2× — close full position)
 *   Stop-loss:   15%
 *   Trade size:  40% of wallet balance
 *   Rationale:  Mid caps have room to double; hold longer, tighter stop.
 *
 * Strategy 3 — BIG CAP SNIPE 5%
 *   Target:     MC $250K – $10M  (large enough to be liquid)
 *   Take-profit: 5%  (quick scalp, close full position)
 *   Stop-loss:   3%
 *   Trade size:  80% of wallet balance (high allocation, low risk per trade)
 *   Rationale:  Large caps rarely rug; scalp small gains reliably.
 */

export type StrategyId = 'LOW_CAP' | 'MID_CAP' | 'BIG_CAP';

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  minMcap: number;      // USD
  maxMcap: number;      // USD
  takeProfitPct: number;
  stopLossPct: number;
  tradeSizePct: number; // % of wallet USDC to use per trade (0–100)
  minScore: number;     // minimum momentum score to enter
}

export const STRATEGIES: Record<StrategyId, Strategy> = {
  LOW_CAP: {
    id: 'LOW_CAP',
    name: 'Snipe Low Cap',
    description: 'MC $44K–$250K · 30% TP · 10% SL · 60% trade size',
    minMcap:       44_000,
    maxMcap:      250_000,
    takeProfitPct: 30,
    stopLossPct:   10,
    tradeSizePct:  60,
    minScore:      45,   // needs buy+ signal
  },
  MID_CAP: {
    id: 'MID_CAP',
    name: 'Mid Cap 2×',
    description: 'MC $250K–$2M · 100% TP · 15% SL · 40% trade size',
    minMcap:      250_000,
    maxMcap:    2_000_000,
    takeProfitPct: 100,
    stopLossPct:    15,
    tradeSizePct:   40,
    minScore:       45,
  },
  BIG_CAP: {
    id: 'BIG_CAP',
    name: 'Big Cap Scalp 5%',
    description: 'MC $250K–$10M · 5% TP · 3% SL · 80% trade size',
    minMcap:      250_000,
    maxMcap:   10_000_000,
    takeProfitPct:  5,
    stopLossPct:    3,
    tradeSizePct:  80,
    minScore:      25,   // even neutral is fine for a 5% scalp
  },
};

export const DEFAULT_STRATEGY: StrategyId = 'LOW_CAP';
