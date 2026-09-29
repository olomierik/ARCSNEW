import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Bot, TrendingUp, TrendingDown, Wallet, Play, Pause,
  RefreshCw, ExternalLink, ChevronDown, ChevronUp, Gift,
  AlertTriangle, Zap, ShieldCheck, ShieldX, ShieldAlert,
  Key, Eye, EyeOff, Copy, LogIn,
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

const HARD_BLOCK_FLAGS: SafetyFlag[] = ['mint_authority','freeze_authority','unverified_contract','honeypot'];

const FLAG_LABELS: Record<SafetyFlag, string> = {
  mint_authority:       'Mintable',
  freeze_authority:     'Freeze Auth',
  unverified_contract:  'Unverified',
  honeypot:             'Honeypot',
  fake_volume:          'Fake Volume',
  dev_dump_risk:        'Dev Dump Risk',
  low_liquidity:        'Low Liquidity',
  suspicious_spike:     'Pump Spike',
  too_young:            'Too New',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const _env = import.meta as unknown as { env: Record<string, string | undefined> };
const API_BASE = _env.env.VITE_API_URL ? _env.env.VITE_API_URL : '/api';

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

function SafetyBadge({ safety }: { safety?: SafetyReport }) {
  if (!safety) return null;
  if (safety.blocked || !safety.safe) {
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
        <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Caution</span>
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

// ── Passcode revealed modal ───────────────────────────────────────────────────
function PasscodeModal({ passcode, address, onDone }: {
  passcode: string; address: string; onDone: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Key size={20} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--ink)' }}>Wallet Created!</div>
            <div className="text-xs" style={{ color: 'var(--subtle)' }}>Save these credentials now</div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl px-4 py-3 text-xs flex gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>This is the <strong>only time</strong> your passcode is shown. If you lose it you cannot recover this wallet.</span>
        </div>

        {/* Wallet address */}
        <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: 'var(--surface-muted)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>Wallet Address</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs truncate flex-1" style={{ color: 'var(--ink-2)' }}>{address}</span>
            <button onClick={() => copy(address, 'Address')} className="flex-shrink-0">
              <Copy size={13} style={{ color: 'var(--subtle)' }} />
            </button>
          </div>
        </div>

        {/* Passcode */}
        <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: 'var(--surface-muted)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>Your Passcode</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-widest flex-1"
              style={{ color: 'var(--accent)', filter: revealed ? 'none' : 'blur(6px)', userSelect: revealed ? 'text' : 'none' }}>
              {passcode}
            </span>
            <button onClick={() => setRevealed(!revealed)} className="flex-shrink-0">
              {revealed ? <EyeOff size={15} style={{ color: 'var(--subtle)' }} /> : <Eye size={15} style={{ color: 'var(--subtle)' }} />}
            </button>
            {revealed && (
              <button onClick={() => copy(passcode, 'Passcode')} className="flex-shrink-0">
                <Copy size={13} style={{ color: 'var(--subtle)' }} />
              </button>
            )}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Use this passcode to access your wallet and claim profits.
          </div>
        </div>

        {/* Confirm */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-green-400" />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            I have saved my passcode and wallet address in a safe place.
          </span>
        </label>

        <button onClick={onDone} disabled={!confirmed}
          className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all"
          style={{ background: '#22c55e', color: '#0d1b2f' }}>
          I've saved it — Continue
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TradingPanel() {
  const [wallet, setWallet] = useState<TradingWallet | null>(null);
  const [balance, setBalance] = useState('0');
  const [signals, setSignals] = useState<TokenSignal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [claimable, setClaimable] = useState('0');
  const [signalsAt, setSignalsAt] = useState<number | null>(null);
  const [strategies, setStrategies] = useState<Record<StrategyId, StrategyDef> | null>(null);

  // Wallet creation / login state
  const [view, setView] = useState<'home' | 'creating' | 'login'>('home');
  const [creating, setCreating] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [revealModal, setRevealModal] = useState<{ passcode: string; address: string } | null>(null);

  // Bot state
  const [toggling, setToggling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('LOW_CAP');
  const [takeProfitPct, setTakeProfitPct] = useState(30);
  const [stopLossPct, setStopLossPct] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  // Persist passcode in sessionStorage so user stays logged in
  const storedPasscode = typeof window !== 'undefined' ? sessionStorage.getItem('arcstable_passcode') ?? '' : '';
  const [sessionPasscode, setSessionPasscode] = useState(storedPasscode);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const walletOwner = wallet?.ownerAddress ?? '';

  const fetchAll = useCallback(async () => {
    if (!sessionPasscode) return;
    try {
      const [wRes, sRes, tRes, stratRes] = await Promise.all([
        api<{ wallet: TradingWallet | null; balance: string }>('/wallets/lookup', {
          method: 'POST',
          body: JSON.stringify({ passcode: sessionPasscode }),
        }),
        api<{ signals: TokenSignal[]; fetchedAt: number }>('/signals'),
        api<{ trades: Trade[] }>(`/trades?owner=${walletOwner}`),
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
      if (wRes.wallet?.ownerAddress) {
        const pRes = await api<{ profit: { claimable: string } }>(`/wallets/profit?owner=${wRes.wallet.ownerAddress}`);
        setClaimable(pRes.profit.claimable);
      }
    } catch (err) {
      console.error('[TradingPanel] fetch error', err);
    }
  }, [sessionPasscode, walletOwner]);

  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => { void fetchAll(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function createWallet() {
    setCreating(true);
    try {
      const res = await api<{ wallet: TradingWallet; passcode: string; address: string }>(
        '/wallets/create-standalone', { method: 'POST', body: JSON.stringify({}) }
      );
      setRevealModal({ passcode: res.passcode, address: res.address });
      setWallet(res.wallet);
      sessionStorage.setItem('arcstable_passcode', res.passcode);
      setSessionPasscode(res.passcode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  }

  async function loginWithPasscode() {
    if (!passcodeInput.trim()) return;
    setLoggingIn(true);
    try {
      const res = await api<{ wallet: TradingWallet; balance: string }>(
        '/wallets/lookup', { method: 'POST', body: JSON.stringify({ passcode: passcodeInput.trim() }) }
      );
      sessionStorage.setItem('arcstable_passcode', passcodeInput.trim());
      setSessionPasscode(passcodeInput.trim());
      setWallet(res.wallet);
      setBalance(res.balance);
      setView('home');
      toast.success('Wallet loaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Passcode not found');
    } finally {
      setLoggingIn(false);
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

  async function claimProfit() {
    if (!wallet?.ownerAddress) return;
    setClaiming(true);
    try {
      const res = await api<{ claimed: string }>('/wallets/claim', {
        method: 'POST',
        body: JSON.stringify({ ownerAddress: wallet.ownerAddress }),
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

  function handleStrategySelect(id: StrategyId) {
    setSelectedStrategy(id);
    if (strategies?.[id]) {
      setTakeProfitPct(strategies[id].takeProfitPct);
      setStopLossPct(strategies[id].stopLossPct);
    }
  }

  function logout() {
    sessionStorage.removeItem('arcstable_passcode');
    setSessionPasscode('');
    setWallet(null);
    setBalance('0');
    setView('home');
  }

  // ── No wallet session: show create/login ──────────────────────────────────
  if (!wallet && !sessionPasscode) {
    return (
      <div className="w-full max-w-lg flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="display font-bold text-base" style={{ color: 'var(--ink)' }}>Auto-Trading</h2>
        </div>

        {view === 'home' && (
          <div className="rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(172,198,233,0.12)' }}>
                <Wallet size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>Get a Trading Wallet</p>
                <p className="text-sm text-pretty max-w-xs" style={{ color: 'var(--muted)' }}>
                  No wallet extension needed. Create a dedicated USDC trading wallet in seconds.
                  The bot trades Arc tokens automatically using your chosen strategy.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => { void createWallet(); }} disabled={creating}
                className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                <Key size={15} />
                {creating ? 'Creating Wallet…' : 'Create New Trading Wallet'}
              </button>
              <button onClick={() => setView('login')}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}>
                <LogIn size={15} />
                I Already Have a Wallet (Enter Passcode)
              </button>
            </div>

            {/* How it works */}
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-muted)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>How it works</div>
              {[
                ['1', 'Create your wallet — no extension needed'],
                ['2', 'Fund it with USDC on Arc'],
                ['3', 'Choose a strategy (Low Cap / Mid Cap / Big Cap)'],
                ['4', 'Start the bot — it scans, safety-checks, and trades every 5 min'],
              ].map(([n, t]) => (
                <div key={n} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(172,198,233,0.18)', color: 'var(--accent)' }}>{n}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <button onClick={() => setView('home')} className="text-xs self-start flex items-center gap-1"
              style={{ color: 'var(--subtle)' }}>
              ← Back
            </button>
            <div className="font-bold text-base" style={{ color: 'var(--ink)' }}>Enter Your Passcode</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Enter the 8-character passcode you received when you created your wallet.
            </p>
            <input
              type="text"
              maxLength={8}
              placeholder="e.g. A1B2C3D4"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value.toUpperCase())}
              className="w-full rounded-xl px-4 py-3 font-mono text-lg text-center font-bold tracking-widest outline-none"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--accent)' }}
            />
            <button onClick={() => { void loginWithPasscode(); }} disabled={loggingIn || passcodeInput.length < 6}
              className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
              {loggingIn ? 'Loading…' : 'Load My Wallet'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const hasClaimable = parseFloat(claimable) > 0;

  return (
    <div className="w-full max-w-lg flex flex-col gap-4">
      {/* Passcode reveal modal */}
      {revealModal && (
        <PasscodeModal
          passcode={revealModal.passcode}
          address={revealModal.address}
          onDone={() => setRevealModal(null)}
        />
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="display font-bold text-base" style={{ color: 'var(--ink)' }}>Auto-Trading</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { void refresh(); }} disabled={refreshing}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-50"
            style={{ color: 'var(--subtle)', background: 'var(--surface-muted)' }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={logout}
            className="text-xs px-2 py-1 rounded-lg transition-all"
            style={{ color: 'var(--subtle)', background: 'var(--surface-muted)' }}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Wallet card ── */}
      {wallet && (
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

          {showSettings && strategies && (
            <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'var(--surface-muted)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>Choose Strategy</div>
              <div className="flex flex-col gap-2">
                {(Object.values(strategies)).map((s) => {
                  const meta = STRATEGY_META[s.id];
                  const active = selectedStrategy === s.id;
                  return (
                    <button key={s.id} onClick={() => handleStrategySelect(s.id)}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{ background: active ? meta.bg : 'var(--surface)', border: `1px solid ${active ? meta.color : 'var(--border)'}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm" style={{ color: active ? meta.color : 'var(--ink)' }}>
                          {meta.emoji} {s.name}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                          MC ${fmt(s.minMcap)} – ${fmt(s.maxMcap)}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.description}</div>
                      <div className="flex gap-3 mt-1.5 text-xs tabular-nums">
                        <span style={{ color: '#22c55e' }}>TP +{s.takeProfitPct}%</span>
                        <span style={{ color: '#ef4444' }}>SL -{s.stopLossPct}%</span>
                        <span style={{ color: 'var(--subtle)' }}>Size {s.tradeSizePct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs mb-1.5 font-medium" style={{ color: 'var(--subtle)' }}>Take Profit %</div>
                  <input type="number" min={1} max={100} value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="w-full bg-transparent text-lg font-bold tabular-nums outline-none"
                    style={{ color: '#22c55e', fontFamily: 'Space Grotesk, sans-serif' }} />
                </div>
                <div>
                  <div className="text-xs mb-1.5 font-medium" style={{ color: 'var(--subtle)' }}>Stop Loss %</div>
                  <input type="number" min={1} max={100} value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className="w-full bg-transparent text-lg font-bold tabular-nums outline-none"
                    style={{ color: '#ef4444', fontFamily: 'Space Grotesk, sans-serif' }} />
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
      )}

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
      {wallet && parseFloat(balance) < 1 && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#f59e0b' }}>
            Fund your wallet at <span className="font-mono text-xs">{wallet.address.slice(0, 10)}…</span> with USDC on Arc to enable trading.
          </p>
        </div>
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
                    {/* Token info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{s.symbol}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--subtle)' }}>{s.name}</span>
                      </div>
                      <div className="text-xs tabular-nums mt-0.5" style={{ color: 'var(--muted)' }}>
                        MC ${fmt(s.marketCap)} · Vol ${fmt(s.volume24h)} · ${s.priceUsdc < 0.01 ? s.priceUsdc.toExponential(2) : s.priceUsdc.toFixed(4)}
                      </div>
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

                    {/* Signal badge */}
                    <div className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </div>

                    {/* Score + safety */}
                    <div className="w-12 flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-xs tabular-nums font-bold" style={{ color: 'var(--accent)' }}>{s.score}</span>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: isBlocked ? '#ef4444' : 'var(--accent)' }} />
                      </div>
                      <SafetyBadge safety={s.safety} />
                    </div>
                  </div>

                  {/* Flag chips */}
                  {hardFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hardFlags.map((f) => (
                        <span key={f} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                          {FLAG_LABELS[f]}
                        </span>
                      ))}
                    </div>
                  )}
                  {warnFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
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
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
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
        Signals from CoinGecko. Safety-scanned before every trade. Profits not guaranteed — always set a stop-loss.
      </p>
    </div>
  );
}
