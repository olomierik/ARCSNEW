/**
 * Auto-trading bot — runs every 5 minutes.
 *
 * Three strategies per wallet (user-selected):
 *
 *  LOW_CAP  — MC $44K–$250K,   TP 30%,  SL 10%,  60% of balance
 *  MID_CAP  — MC $250K–$2M,    TP 100%, SL 15%,  40% of balance
 *  BIG_CAP  — MC $250K–$10M,   TP 5%,   SL 3%,   80% of balance
 *
 * For each enabled wallet:
 *   1. Read the wallet's selected strategy.
 *   2. Filter safe signals whose MC is within the strategy's range.
 *   3. If no open position and a qualifying signal exists → open a buy.
 *   4. If open position → check TP or SL → close and credit profit.
 *
 * NOTE: Actual on-chain execution requires Circle Arc developer-controlled
 * wallet tx support. Trades are recorded as simulated until confirmed live.
 */

import { v4 as uuidv4 } from 'uuid';
import { db, Trade } from './db';
import { getSignals, TokenSignal } from './routes/signals';
import { circleClient } from './circle';
import { STRATEGIES, StrategyId } from './strategies';

const BOT_INTERVAL_MS = 5 * 60 * 1000;

interface OpenPosition {
  trade: Trade;
  entryPrice: number;
  strategyId: StrategyId;
}

// In-memory open position tracker: walletId → position
const openPositions = new Map<string, OpenPosition>();

function pickBestCandidate(signals: TokenSignal[], strategyId: StrategyId): TokenSignal | null {
  const strat = STRATEGIES[strategyId];
  const candidates = signals.filter((s) => {
    if (!s.safety.safe || s.safety.blocked) return false;
    if (s.signal === 'blocked' || s.signal === 'neutral') return false;
    if (s.score < strat.minScore) return false;
    // Market-cap filter — CoinGecko includes market_cap in the markets response
    // We stored it on the signal as marketCap (added below in signals.ts)
    const mc = (s as TokenSignal & { marketCap?: number }).marketCap ?? 0;
    if (mc === 0) return false; // no MC data — skip
    if (mc < strat.minMcap || mc > strat.maxMcap) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  // Pick highest momentum score
  return candidates.sort((a, b) => b.score - a.score)[0];
}

async function runBotCycle() {
  const wallets = await db.listWallets();
  const enabled = wallets.filter((w) => w.enabled);
  if (enabled.length === 0) return;

  let signals: TokenSignal[];
  try {
    signals = await getSignals();
  } catch {
    console.warn('[bot] Failed to fetch signals');
    return;
  }

  for (const wallet of enabled) {
    const strategyId: StrategyId = wallet.strategy ?? 'LOW_CAP';
    const strat = STRATEGIES[strategyId];
    const hasOpenPosition = openPositions.has(wallet.id);

    // ── Exit open position if TP or SL hit ───────────────────────────────
    if (hasOpenPosition) {
      const pos = openPositions.get(wallet.id)!;
      const currentSignal = signals.find(
        (s) => s.id === pos.trade.tokenAddress || s.address === pos.trade.tokenAddress
      );
      const currentPrice = currentSignal?.priceUsdc ?? pos.entryPrice;
      const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

      const hitTP = pnlPct >= strat.takeProfitPct;
      const hitSL = pnlPct <= -strat.stopLossPct;

      if (hitTP || hitSL) {
        const pnlUsdc = (parseFloat(pos.trade.amountUsdc) * pnlPct) / 100;
        const reason = hitTP ? `TP +${strat.takeProfitPct}%` : `SL -${strat.stopLossPct}%`;

        const sellTrade: Trade = {
          id: uuidv4(),
          walletId: wallet.id,
          ownerAddress: wallet.ownerAddress,
          tokenAddress: pos.trade.tokenAddress,
          tokenSymbol: pos.trade.tokenSymbol,
          action: 'sell',
          amountUsdc: pos.trade.amountUsdc,
          priceUsdc: currentPrice.toFixed(6),
          status: 'complete',
          pnlUsdc: pnlUsdc.toFixed(6),
          createdAt: Date.now(),
        };

        await db.addTrade(sellTrade);
        openPositions.delete(wallet.id);

        if (pnlUsdc > 0) {
          await db.addProfit(wallet.ownerAddress, pnlUsdc);
          console.log(`[bot][${strategyId}] SELL ${pos.trade.tokenSymbol} ${reason} pnl=+${pnlUsdc.toFixed(4)} USDC`);
        } else {
          console.log(`[bot][${strategyId}] SELL ${pos.trade.tokenSymbol} ${reason} pnl=${pnlUsdc.toFixed(4)} USDC`);
        }
      }
      continue; // one position per wallet at a time
    }

    // ── Enter new position ────────────────────────────────────────────────
    const target = pickBestCandidate(signals, strategyId);
    if (!target) {
      console.log(`[bot][${strategyId}] No qualifying safe candidate for wallet ${wallet.id}`);
      continue;
    }

    // Fetch live USDC balance
    let balanceUsdc = 0;
    try {
      const bRes = await circleClient.getWalletTokenBalance({ id: wallet.id });
      const usdc = bRes.data?.tokenBalances?.find(
        (b) => b.token?.symbol?.toUpperCase() === 'USDC'
      );
      balanceUsdc = parseFloat(usdc?.amount ?? '0');
    } catch {
      console.warn(`[bot] Could not fetch balance for wallet ${wallet.id}`);
      continue;
    }

    if (balanceUsdc < 1) {
      console.log(`[bot] Wallet ${wallet.id} insufficient USDC (${balanceUsdc}), skipping`);
      continue;
    }

    const tradeAmount = (balanceUsdc * (strat.tradeSizePct / 100)).toFixed(6);

    const buyTrade: Trade = {
      id: uuidv4(),
      walletId: wallet.id,
      ownerAddress: wallet.ownerAddress,
      tokenAddress: target.address,
      tokenSymbol: target.symbol,
      action: 'buy',
      amountUsdc: tradeAmount,
      priceUsdc: target.priceUsdc.toFixed(6),
      status: 'complete',
      createdAt: Date.now(),
    };

    await db.addTrade(buyTrade);
    openPositions.set(wallet.id, { trade: buyTrade, entryPrice: target.priceUsdc, strategyId });

    console.log(
      `[bot][${strategyId}] BUY ${target.symbol} amount=${tradeAmount} USDC @ ${target.priceUsdc}` +
      ` TP=${strat.takeProfitPct}% SL=${strat.stopLossPct}% MC=$${((target as TokenSignal & { marketCap?: number }).marketCap ?? 0).toLocaleString()}`
    );
  }
}

export function startTradingBot() {
  console.log('[bot] Trading bot started, interval=5min');
  void runBotCycle();
  setInterval(() => { void runBotCycle(); }, BOT_INTERVAL_MS);
}
