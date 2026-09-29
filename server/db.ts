/**
 * Supabase-backed data layer.
 * Replaces the previous JSON-file store with a real Postgres database.
 * All functions are async and return the same logical shape as before
 * so routes and the bot need minimal changes.
 */
import { supabase } from './supabase';
import type { StrategyId } from './strategies';

export interface TradingWallet {
  id: string;
  walletSetId: string;
  address: string;
  ownerAddress: string;
  enabled: boolean;
  strategy: StrategyId;
  takeProfitPct: number;
  stopLossPct: number;
  createdAt: number;
}

export interface Trade {
  id: string;
  walletId: string;
  ownerAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  action: 'buy' | 'sell';
  amountUsdc: string;
  priceUsdc: string;
  txId?: string;
  status: 'pending' | 'complete' | 'failed';
  pnlUsdc?: string;
  createdAt: number;
}

export interface Profit {
  ownerAddress: string;
  claimable: string;
  lastUpdated: number;
}

// ── helpers: map DB row ↔ TS shape ─────────────────────────────────────────

function rowToWallet(r: Record<string, unknown>): TradingWallet {
  return {
    id: r.id as string,
    walletSetId: r.wallet_set_id as string,
    address: r.address as string,
    ownerAddress: r.owner_address as string,
    enabled: r.enabled as boolean,
    strategy: (r.strategy as StrategyId | undefined) ?? 'LOW_CAP',
    takeProfitPct: Number(r.take_profit_pct),
    stopLossPct: Number(r.stop_loss_pct),
    createdAt: Number(r.created_at),
  };
}

function walletToRow(w: TradingWallet) {
  return {
    id: w.id,
    wallet_set_id: w.walletSetId,
    address: w.address,
    owner_address: w.ownerAddress,
    enabled: w.enabled,
    strategy: w.strategy,
    take_profit_pct: w.takeProfitPct,
    stop_loss_pct: w.stopLossPct,
    created_at: w.createdAt,
  };
}

function rowToTrade(r: Record<string, unknown>): Trade {
  return {
    id: r.id as string,
    walletId: r.wallet_id as string,
    ownerAddress: r.owner_address as string,
    tokenAddress: r.token_address as string,
    tokenSymbol: r.token_symbol as string,
    action: r.action as 'buy' | 'sell',
    amountUsdc: r.amount_usdc as string,
    priceUsdc: r.price_usdc as string,
    txId: r.tx_id as string | undefined,
    status: r.status as Trade['status'],
    pnlUsdc: r.pnl_usdc as string | undefined,
    createdAt: Number(r.created_at),
  };
}

function tradeToRow(t: Trade) {
  return {
    id: t.id,
    wallet_id: t.walletId,
    owner_address: t.ownerAddress,
    token_address: t.tokenAddress,
    token_symbol: t.tokenSymbol,
    action: t.action,
    amount_usdc: t.amountUsdc,
    price_usdc: t.priceUsdc,
    tx_id: t.txId ?? null,
    status: t.status,
    pnl_usdc: t.pnlUsdc ?? null,
    created_at: t.createdAt,
  };
}

// ── db API ──────────────────────────────────────────────────────────────────

export const db = {
  // Wallets
  async getWallet(id: string): Promise<TradingWallet | undefined> {
    const { data } = await supabase
      .from('trading_wallets')
      .select('*')
      .eq('id', id)
      .single();
    return data ? rowToWallet(data as Record<string, unknown>) : undefined;
  },

  async getWalletByOwner(owner: string): Promise<TradingWallet | undefined> {
    const { data } = await supabase
      .from('trading_wallets')
      .select('*')
      .ilike('owner_address', owner)
      .single();
    return data ? rowToWallet(data as Record<string, unknown>) : undefined;
  },

  async listWallets(): Promise<TradingWallet[]> {
    const { data } = await supabase.from('trading_wallets').select('*');
    return (data ?? []).map((r) => rowToWallet(r as Record<string, unknown>));
  },

  async saveWallet(w: TradingWallet): Promise<void> {
    const { error } = await supabase
      .from('trading_wallets')
      .upsert(walletToRow(w), { onConflict: 'id' });
    if (error) throw new Error('[db] saveWallet: ' + error.message);
  },

  async updateWallet(id: string, patch: Partial<TradingWallet>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (patch.strategy !== undefined) row.strategy = patch.strategy;
    if (patch.takeProfitPct !== undefined) row.take_profit_pct = patch.takeProfitPct;
    if (patch.stopLossPct !== undefined) row.stop_loss_pct = patch.stopLossPct;
    if (Object.keys(row).length === 0) return;
    const { error } = await supabase.from('trading_wallets').update(row).eq('id', id);
    if (error) throw new Error('[db] updateWallet: ' + error.message);
  },

  // Trades
  async addTrade(t: Trade): Promise<void> {
    const { error } = await supabase.from('trades').insert(tradeToRow(t));
    if (error) throw new Error('[db] addTrade: ' + error.message);
  },

  async updateTrade(id: string, patch: Partial<Trade>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.pnlUsdc !== undefined) row.pnl_usdc = patch.pnlUsdc;
    if (patch.txId !== undefined) row.tx_id = patch.txId;
    if (Object.keys(row).length === 0) return;
    const { error } = await supabase.from('trades').update(row).eq('id', id);
    if (error) throw new Error('[db] updateTrade: ' + error.message);
  },

  async getTradesByOwner(owner: string): Promise<Trade[]> {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .ilike('owner_address', owner)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []).map((r) => rowToTrade(r as Record<string, unknown>));
  },

  async getAllTrades(): Promise<Trade[]> {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []).map((r) => rowToTrade(r as Record<string, unknown>));
  },

  // Profits
  async getProfit(owner: string): Promise<Profit> {
    const { data } = await supabase
      .from('profits')
      .select('*')
      .ilike('owner_address', owner)
      .single();
    if (!data) return { ownerAddress: owner, claimable: '0', lastUpdated: 0 };
    const r = data as Record<string, unknown>;
    return {
      ownerAddress: r.owner_address as string,
      claimable: r.claimable as string,
      lastUpdated: Number(r.last_updated),
    };
  },

  async addProfit(owner: string, amountUsdc: number): Promise<void> {
    const existing = await this.getProfit(owner);
    const newClaimable = (parseFloat(existing.claimable) + amountUsdc).toFixed(6);
    const { error } = await supabase
      .from('profits')
      .upsert(
        { owner_address: owner.toLowerCase(), claimable: newClaimable, last_updated: Date.now() },
        { onConflict: 'owner_address' }
      );
    if (error) throw new Error('[db] addProfit: ' + error.message);
  },

  async resetProfit(owner: string): Promise<void> {
    const { error } = await supabase
      .from('profits')
      .upsert(
        { owner_address: owner.toLowerCase(), claimable: '0', last_updated: Date.now() },
        { onConflict: 'owner_address' }
      );
    if (error) throw new Error('[db] resetProfit: ' + error.message);
  },
};
