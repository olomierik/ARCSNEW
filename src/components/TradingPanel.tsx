import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  Bot, TrendingUp, TrendingDown, Wallet, Play, Pause,
  RefreshCw, ExternalLink, ChevronDown, ChevronUp, Gift,
  AlertTriangle, Zap, ShieldCheck, ShieldX, ShieldAlert,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
type StrategyId = 'LOW_CAP' | 'MID_CAP' | 'BIG_CAP';

interface StrategyDef {
  id: StrategyId;
  name: string;
  description: string;
  minMcap: number;
  maxMcap: number;
  takeProfitPct: number;
  stopLossPct: number;
  tradeSizePct: number;
}

const STRATEGY_META: Record<StrategyId, { color: string; bg: string; emoji: string }> = {
  LOW_CAP: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', emoji: '🎯' },
  MID_CAP: { color: 'var(--accent)', bg: 'rgba(172,198,233,0.12)', emoji: '📈' },
  BIG_CAP: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)', emoji: '🏦' },
};

interface TradingWallet {
  id: string;
  address: string;
  ownerAddress: string;
  enabled: boolean;
  strategy: StrategyId;
  takeProfitPct: number;
  stopLossPct: number;
  createdAt: number;
}

type SafetyFlag =
  | 'mint_authority' | 'freeze_authority' | 'unverified_contract'
  | 'honeypot' | 'fake_volume' | 'dev_dump_risk'
  | 'low_liquidity' | 'suspicious_spike' | 'too_young';

interface SafetyReport {
  safe: boolean;
  score: number;
  flags: SafetyFlag[];
  blocked: boolean;
  checkedAt: number;
}

interface TokenSignal {
  id: string;
  address: string;
  symbol: string;
  name: string;
  priceUsdc: number;
  volume24h: number;
  marketCap: number;
  priceChange1h: number;
  priceChange24h: number;
  score: number;
  signal: 'strong_buy' | 'buy' | 'watch' | 'neutral' | 'blocked';
  safety: SafetyReport;
}

interface Trade {
  id: string;
  tokenSymbol: string;
  action: 'buy' | 'sell';
  amountUsdc: string;
  priceUsdc: string;
  status: string;
  pnlUsdc?: string;
  createdAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// In production (Netlify) the backend is on Railway.
// VITE_API_URL is set in Netlify env vars to e.g. https://arcstable.up.railway.app
// In dev it falls back to the Vite proxy (/api → localhost:3001).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)
  ? `${import.meta.env.VITE_API_URL as string}`
  : '/api';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

function signalBadge(signal: TokenSignal['signal']) {
  const map: Record<TokenSignal['signal'], { label: string; color: string; bg: string }> = {
    strong_buy: { label: 'Strong Buy', color: '#22c55e',        bg: 'rgba(34,197,94,0.12)' },
    buy:        { label: 'Buy',        color: '#86efac',        bg: 'rgba(134,239,172,0.1)' },
    watch:      { label: 'Watch',      color: 'var(--accent)',  bg: 'rgba(172,198,233,0.12)' },
    neutral:    { label: 'Neutral',    color: 'var(--muted)',   bg: 'var(--surface-muted)' },
    blocked:    { label: 'Blocked',    color: '#ef4444',        bg: 'rgba(239,68,68,0.10)' },
  };
  return map[signal];
}

const FLAG_LABELS: Record<SafetyFlag, string> = {
  mint_authority:      'Mint Authority',
  freeze_authority:    'Freeze Authority',
  unverified_contract: 'Unverified Contract',
  honeypot:            'Honeypot',
  fake_volume:         'Fake Volume',
  dev_dump_risk:       'Dev Dump Risk',
  low_liquidity:       'Low Liquidity',
  suspicious_spike:    'Suspicious Spike',
  too_young:           'Too Young',
};

const HARD_BLOCK_FLAGS: SafetyFlag[] = [
  'mint_authority', 'freeze_authority', 'unverified_contract', 'honeypot', 'fake_volume',
];

function SafetyBadge({ safety }: { safety: SafetyReport }) {
  if (safety.blocked) {
    return (
      <div className="flex items-center gap-1" title={safety.flags.map((f) => FLAG_LABELS[f]).join(', ')}>
        <ShieldX size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
        <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Unsafe</span>
      </div>
    );
  }
  if (safety.flags.length > 0) {
    return (
      <div className="flex items-center gap-1" title={safety.flags.map((f) => FLAG_LABELS[f]).join(', ')}>
        <ShieldAlert size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Warn</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <ShieldCheck size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
      <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Safe</span>
    </div>
  );
}

function fmt(n: number, dec = 2) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(dec);
}

function pctColor(v: number) {
  return v > 0 ? 'var(--success, #22c55e)' : v < 0 ? 'var(--danger, #ef4444)' : 'var(--muted)';
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingPanel() {
  const { address, isConnected } = useAccount();

  const [wallet, setWallet] = useState<TradingWallet | null>(null);
  const [balance, setBalance] = useState('0');
  const [signals, setSignals] = useState<TokenSignal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [claimable, setClaimable] = useState('0');
  const [signalsAt, setSignalsAt] = useState<number | null>(null);
  const [strategies, setStrategies] = useState<Record<StrategyId, StrategyDef> | null>(null);

  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('LOW_CAP');
  const [takeProfitPct, setTakeProfitPct] = useState(30);
  const [stopLossPct, setStopLossPct] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!address) return;
    try {
      const [wRes, sRes, tRes, pRes, stratRes] = await Promise.all([
        api<{ wallet: TradingWallet | null; balance: string }>(`/wallets?owner=${address}`),
        api<{ signals: TokenSignal[]; fetchedAt: number }>('/signals'),
        api<{ trades: Trade[] }>(`/trades?owner=${address}`),
        api<{ profit: { claimable: string } }>(`/wallets/profit?owner=${address}`),
        api<{ strategies: Record<StrategyId, StrategyDef> }>('/wallets/strategies'),
      ]);
      setWallet(wRes.wallet);
      setBalance(wRes.balance);
      if (wRes.wallet) {
        setSelectedStrategy(wRes.wallet.strategy ?? 'LOW_CAP');
        setTakeProfitPct(wRes.wallet.takeProfitPct);
        setStopLossPct(wRes.wallet.stopLossPct);
      }
      setStrategies(stratRes.strategies);
      setSignals(sRes.signals.slice(0, 15));
      setSignalsAt(sRes.fetchedAt);
      setTrades(tRes.trades.slice(-20).reverse());
      setClaimable(pRes.profit.claimable);
    } catch (err) {
      console.error('[TradingPanel] fetch error', err);
    }
  }, [address]);

  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => { void fetchAll(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function createWallet() {
    if (!address) return;
    setCreating(true);
    try {
      const res = await api<{ wallet: TradingWallet }>('/wallets/create', {
        method: 'POST',
        body: JSON.stringify({ ownerAddress: address }),
      });
      setWallet(res.wallet);
      toast.success('Trading wallet created! Fund it with USDC to start.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  }

  async function toggleBot() {
    if (!wallet) return;
    setToggling(true);
    try {
      await api('/wallets/toggle', {
        method: 'POST',
        body: JSON.stringify({ walletId: wallet.id, enabled: !wallet.enabled }),
      });
      setWallet({ ...wallet, enabled: !wallet.enabled });
      toast.success(wallet.enabled ? 'Auto-trading paused' : 'Auto-trading started!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle bot');
    } finally {
      setToggling(false);
    }
  }

  async function saveSettings() {
    if (!wallet) return;
    try {
      await api('/wallets/settings', {
        method: 'POST',
        body: JSON.stringify({ walletId: wallet.id, strategy: selectedStrategy, takeProfitPct, stopLossPct }),
      });
      setWallet({ ...wallet, strategy: selectedStrategy, takeProfitPct, stopLossPct });
      toast.success('Strategy saved');
      setShowSettings(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }

  function handleStrategySelect(id: StrategyId) {
    setSelectedStrategy(id);
    if (strategies?.[id]) {
      setTakeProfitPct(strategies[id].takeProfitPct);
      setStopLossPct(strategies[id].stopLossPct);
    }
  }

  async function claimProfit() {
    if (!address) return;
    setClaiming(true);
    try {
      const res = await api<{ claimed: string }>('/wallets/claim', {
        method: 'POST',
        body: JSON.stringify({ ownerAddress: address }),
      });
      toast.success(`Claimed ${res.claimed} USDC!`);
      setClaimable('0');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nothing to claim');
    } finally {
      setClaiming(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="w-full max-w-lg flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(172,198,233,0.12)' }}>
          <Bot size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <p className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Connect your wallet</p>
        <p className="text-sm max-w-xs text-pretty" style={{ color: 'var(--muted)' }}>
          Connect to create a dedicated trading wallet, view signals, and enable auto-trading.
        </p>
      </div>
    );
  }

  const hasClaimable = parseFloat(claimable) > 0;

  return (
    <div className="w-full max-w-lg flex flex-col gap-4">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="display font-bold text-base" style={{ color: 'var(--ink)' }}>Auto-Trading</h2>
        </div>
        <button onClick={() => { void refresh(); }} disabled={refreshing}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{ color: 'var(--subtle)', background: 'var(--surface-muted)' }}>
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── No wallet yet ── */}
      {!wallet ? (
        <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(172,198,233,0.12)' }}>
            <Wallet size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>No trading wallet yet</p>
            <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
              Create a dedicated Circle wallet. Fund it with USDC, then enable the bot to trade automatically based on live signals.
            </p>
          </div>
          <button onClick={() => { void createWallet(); }} disabled={creating}
            className="px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
            {creating ? 'Creating…' : 'Create Trading Wallet'}
          </button>
        </div>
      ) : (
        <>
          {/* ── Wallet card ── */}
          <div className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Trading Wallet</div>
                <div className="font-mono text-xs truncate max-w-[200px]" style={{ color: 'var(--ink-2)' }}>
                  {wallet.address}
                </div>
                <a href={`https://explorer.arc.io/address/${wallet.address}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs mt-0.5 hover:underline" style={{ color: 'var(--subtle)' }}>
                  <ExternalLink size={10} /> View on Explorer
                </a>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>USDC Balance</div>
                <div className="tabular-nums font-bold text-xl display" style={{ color: 'var(--accent)' }}>
                  {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</div>
              </div>
            </div>

            {/* Bot toggle */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: wallet.enabled ? 'rgba(34,197,94,0.08)' : 'var(--surface-muted)', border: `1px solid ${wallet.enabled ? 'rgba(34,197,94,0.2)' : 'var(--border)'}` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: wallet.enabled ? '#22c55e' : 'var(--subtle)', boxShadow: wallet.enabled ? '0 0 6px #22c55e' : 'none' }} />
                <span className="text-sm font-medium" style={{ color: wallet.enabled ? '#22c55e' : 'var(--muted)' }}>
                  {wallet.enabled ? 'Bot running' : 'Bot paused'}
                </span>
                {wallet.enabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: STRATEGY_META[wallet.strategy ?? 'LOW_CAP'].bg, color: STRATEGY_META[wallet.strategy ?? 'LOW_CAP'].color }}>
                    {wallet.strategy ?? 'LOW_CAP'} · TP +{wallet.takeProfitPct}% / SL -{wallet.stopLossPct}%
                  </span>
                )}
              </div>
              <button onClick={() => { void toggleBot(); }} disabled={toggling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                style={wallet.enabled
                  ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }
                  : { background: 'var(--accent)', color: '#0d1b2f' }}>
                {wallet.enabled ? <Pause size={13} /> : <Play size={13} />}
                {toggling ? '…' : wallet.enabled ? 'Pause' : 'Start Bot'}
              </button>
            </div>

            {/* Strategy / Settings toggle */}
            <button onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between text-xs w-full px-1"
              style={{ color: 'var(--subtle)' }}>
              <span>Strategy &amp; Settings</span>
              {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showSettings && (
              <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'var(--surface-muted)' }}>

                {/* Strategy cards */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--subtle)' }}>Select Strategy</div>
                  <div className="flex flex-col gap-2">
                    {(['LOW_CAP', 'MID_CAP', 'BIG_CAP'] as StrategyId[]).map((sid) => {
                      const meta = STRATEGY_META[sid];
                      const strat = strategies?.[sid];
                      const active = selectedStrategy === sid;
                      return (
                        <button key={sid} onClick={() => handleStrategySelect(sid)}
                          className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                          style={{
                            background: active ? meta.bg : 'var(--surface)',
                            border: `1.5px solid ${active ? meta.color : 'var(--border)'}`,
                          }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ color: active ? meta.color : 'var(--ink)' }}>
                              {meta.emoji} {strat?.name ?? sid}
                            </span>
                            {active && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: meta.bg, color: meta.color }}>Active</span>
                            )}
                          </div>
                          {strat && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                              MC ${(strat.minMcap / 1000).toFixed(0)}K – ${strat.maxMcap >= 1_000_000
                                ? (strat.maxMcap / 1_000_000).toFixed(0) + 'M'
                                : (strat.maxMcap / 1000).toFixed(0) + 'K'}
                              &nbsp;·&nbsp;TP {strat.takeProfitPct}%&nbsp;·&nbsp;SL {strat.stopLossPct}%
                              &nbsp;·&nbsp;{strat.tradeSizePct}% of balance
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fine-tune TP / SL */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--subtle)' }}>Fine-tune (optional)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs mb-1.5" style={{ color: 'var(--subtle)' }}>Take Profit %</div>
                      <input type="number" min={1} max={1000} value={takeProfitPct}
                        onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                        className="w-full bg-transparent text-lg font-bold tabular-nums outline-none"
                        style={{ color: '#22c55e', fontFamily: 'Space Grotesk, sans-serif' }} />
                    </div>
                    <div>
                      <div className="text-xs mb-1.5" style={{ color: 'var(--subtle)' }}>Stop Loss %</div>
                      <input type="number" min={1} max={100} value={stopLossPct}
                        onChange={(e) => setStopLossPct(Number(e.target.value))}
                        className="w-full bg-transparent text-lg font-bold tabular-nums outline-none"
                        style={{ color: '#ef4444', fontFamily: 'Space Grotesk, sans-serif' }} />
                    </div>
                  </div>
                </div>

                <button onClick={() => { void saveSettings(); }}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                  Save Strategy
                </button>
              </div>
            )}
          </div>

          {/* ── Claimable profit ── */}
          {hasClaimable && (
            <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="flex items-center gap-2">
                <Gift size={16} style={{ color: '#22c55e' }} />
                <div>
                  <div className="text-xs" style={{ color: 'var(--subtle)' }}>Claimable Profit</div>
                  <div className="tabular-nums font-bold" style={{ color: '#22c55e' }}>
                    +{parseFloat(claimable).toFixed(4)} USDC
                  </div>
                </div>
              </div>
              <button onClick={() => { void claimProfit(); }} disabled={claiming}
                className="px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
                style={{ background: '#22c55e', color: '#0d1b2f' }}>
                {claiming ? 'Claiming…' : 'Claim'}
              </button>
            </div>
          )}

          {/* ── Funding notice ── */}
          {parseFloat(balance) < 1 && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: '#f59e0b' }}>
                Fund your trading wallet at <span className="font-mono text-xs">{wallet.address.slice(0, 10)}…</span> with USDC to enable auto-trading.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Signals ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--surface-strong)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Live Signals</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              {signals.filter((s) => s.safety?.safe).length} safe
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
              {signals.filter((s) => s.signal === 'blocked').length} blocked
            </span>
          </div>
          {signalsAt && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
              {new Date(signalsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {signals.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--subtle)' }}>
            Loading signals…
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
            {signals.map((s) => {
              const badge = signalBadge(s.signal);
              const isBlocked = s.signal === 'blocked';
              const hardFlags = s.safety?.flags.filter((f) => (HARD_BLOCK_FLAGS as string[]).includes(f)) ?? [];
              const warnFlags = s.safety?.flags.filter((f) => !(HARD_BLOCK_FLAGS as string[]).includes(f)) ?? [];
              return (
                <div key={s.id}
                  className="px-4 py-3 flex flex-col gap-1.5"
                  style={{ background: isBlocked ? 'rgba(239,68,68,0.03)' : 'var(--surface)', opacity: isBlocked ? 0.8 : 1 }}>
                  <div className="flex items-center gap-3">
                    {/* Token */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{s.symbol}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--subtle)' }}>{s.name}</span>
                      </div>
                      <div className="text-xs tabular-nums mt-0.5" style={{ color: 'var(--muted)' }}>
                        MC ${fmt(s.marketCap)} &middot; Vol ${fmt(s.volume24h)} &middot; ${s.priceUsdc < 0.01 ? s.priceUsdc.toExponential(2) : s.priceUsdc.toFixed(4)}
                      </div>
                    </div>

                    {/* Safety badge */}
                    <div className="flex-shrink-0">
                      {s.safety && <SafetyBadge safety={s.safety} />}
                    </div>

                    {/* Price changes */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs tabular-nums flex items-center gap-1 justify-end"
                        style={{ color: pctColor(s.priceChange1h) }}>
                        {s.priceChange1h > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {s.priceChange1h > 0 ? '+' : ''}{s.priceChange1h.toFixed(2)}% 1h
                      </div>
                      <div className="text-xs tabular-nums" style={{ color: pctColor(s.priceChange24h) }}>
                        {s.priceChange24h > 0 ? '+' : ''}{s.priceChange24h.toFixed(2)}% 24h
                      </div>
                    </div>

                    {/* Signal badge + score */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs tabular-nums font-bold" style={{ color: 'var(--accent)' }}>{s.score}</span>
                        <div className="w-8 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                          <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety flags row */}
                  {(hardFlags.length > 0 || warnFlags.length > 0) && (
                    <div className="flex flex-wrap gap-1 pl-0.5">
                      {hardFlags.map((f) => (
                        <span key={f} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                          {FLAG_LABELS[f]}
                        </span>
                      ))}
                      {warnFlags.map((f) => (
                        <span key={f} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                          {FLAG_LABELS[f]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Trade history ── */}
      {trades.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowTrades(!showTrades)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold"
            style={{ background: 'var(--surface-strong)', color: 'var(--ink)' }}>
            Trade History ({trades.length})
            {showTrades ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTrades && (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {trades.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-2"
                  style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={t.action === 'buy'
                        ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                        : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                      {t.action.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{t.tokenSymbol}</span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                      ${parseFloat(t.amountUsdc).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    {t.pnlUsdc !== undefined && (
                      <div className="tabular-nums text-sm font-semibold"
                        style={{ color: parseFloat(t.pnlUsdc) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {parseFloat(t.pnlUsdc) >= 0 ? '+' : ''}{parseFloat(t.pnlUsdc).toFixed(4)}
                      </div>
                    )}
                    <div className="text-xs" style={{ color: 'var(--subtle)' }}>
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-center px-4 text-pretty" style={{ color: 'var(--subtle)' }}>
        Auto-trading uses signals from CoinGecko volume momentum. Profits are not guaranteed — always use stop-loss.
        Bot checks signals every 5 minutes.
      </p>
    </div>
  );
}
