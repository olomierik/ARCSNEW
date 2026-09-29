import { ArrowRight, Zap, Lock, BarChart2, Repeat2, Bot, ShieldCheck, TrendingUp } from 'lucide-react';

interface Props {
  onLaunch: () => void;
}

const FEATURES = [
  {
    icon: Repeat2,
    title: 'Near-Zero Slippage USDC Swap',
    desc: 'Curve-style StableSwap (A=100) on Arc. Swap USDC with 4bps fees and minimal price impact.',
  },
  {
    icon: Bot,
    title: 'AI Auto-Trading Bot',
    desc: 'Create a wallet in seconds — no extension needed. The bot scans Arc tokens every 5 minutes, safety-checks each one, and executes your strategy automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Built-in Safety Scanner',
    desc: 'Every token is screened for honeypots, mint authority, fake volume, dev dumps, and rug pulls before any trade is made.',
  },
  {
    icon: TrendingUp,
    title: '3 Trading Strategies',
    desc: 'Snipe Low Caps ($44K MC, 30% TP), ride Mid Caps to 2x, or scalp 5% on Big Caps ($250K–$10M). Pick your risk level.',
  },
  {
    icon: BarChart2,
    title: 'Real Yield for Liquidity Providers',
    desc: 'Deposit USDC into the pool and earn swap fees. veARCS holders receive pro-rata USDC every weekly epoch.',
  },
  {
    icon: Lock,
    title: 'Vote-Escrowed Governance',
    desc: 'Lock ARCS up to 4 years for veARCS. More time = more voting power and more fee revenue.',
  },
  {
    icon: Zap,
    title: 'Deflationary ARCS',
    desc: 'BuybackBurner converts protocol revenue into ARCS and burns it to 0xdead — reducing supply over time.',
  },
];

const STATS = [
  { label: 'Swap Fee', value: '4 bps' },
  { label: 'Bot Interval', value: '5 min' },
  { label: 'Strategies', value: '3' },
  { label: 'Safety Checks', value: '9+' },
];

const STRATEGIES = [
  {
    emoji: '🎯',
    name: 'Snipe Low Cap',
    range: '$44K – $250K MC',
    tp: '+30%',
    sl: '-10%',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    emoji: '📈',
    name: 'Mid Cap 2×',
    range: '$250K – $2M MC',
    tp: '+100%',
    sl: '-15%',
    color: 'var(--accent)',
    bg: 'rgba(172,198,233,0.08)',
    border: 'rgba(172,198,233,0.2)',
  },
  {
    emoji: '🏦',
    name: 'Big Cap Scalp',
    range: '$250K – $10M MC',
    tp: '+5%',
    sl: '-3%',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
  },
];

export default function LandingPage({ onLaunch }: Props) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="display text-xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
        </span>
        <button
          onClick={onLaunch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}
        >
          Launch App <ArrowRight size={15} />
        </button>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-20 pb-12 gap-6">
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}
        >
          Live on Arc Mainnet
        </div>
        <h1 className="display text-4xl md:text-6xl font-bold max-w-3xl text-balance" style={{ color: 'var(--ink)' }}>
          Swap USDC.<br />
          <span style={{ color: 'var(--accent)' }}>Auto-Trade Arc Tokens.</span>
        </h1>
        <p className="text-lg max-w-lg text-pretty" style={{ color: 'var(--muted)' }}>
          A USDC liquidity pool with real yield, plus an AI-powered auto-trading bot with
          built-in safety scanning — all on Arc where USDC is the native gas token.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={onLaunch}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            Start Trading <ArrowRight size={16} />
          </button>
          <a
            href="https://explorer.arc.io/address/0xecB0dCd298823a9667ED6a30c43A45935c325f6d"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}
          >
            View Contracts
          </a>
        </div>
      </section>

      {/* Stats strip */}
      <div className="max-w-4xl mx-auto w-full px-4 pb-10">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ background: 'var(--border)', border: '1px solid var(--border)' }}
        >
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-5 gap-1" style={{ background: 'var(--surface-muted)' }}>
              <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{s.value}</span>
              <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--subtle)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Trading highlight */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-10">
        <div className="rounded-2xl p-6 md:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(172,198,233,0.15)' }}>
              <Bot size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Auto-Trading Bot</div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>No wallet extension required</div>
            </div>
          </div>

          {/* Strategy cards */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            {STRATEGIES.map((s) => (
              <div key={s.name} className="rounded-xl p-4"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <div className="text-xl mb-1">{s.emoji}</div>
                <div className="font-bold text-sm mb-0.5" style={{ color: s.color }}>{s.name}</div>
                <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{s.range}</div>
                <div className="flex gap-3 text-xs tabular-nums">
                  <span style={{ color: '#22c55e' }}>TP {s.tp}</span>
                  <span style={{ color: '#ef4444' }}>SL {s.sl}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-4 gap-3">
            {[
              ['1', 'Create wallet', 'No browser extension — one click'],
              ['2', 'Fund with USDC', 'Send USDC to your Arc wallet'],
              ['3', 'Pick a strategy', 'Low Cap, Mid Cap, or Big Cap'],
              ['4', 'Start the bot', 'Scans and trades every 5 minutes'],
            ].map(([n, title, desc]) => (
              <div key={n} className="flex flex-col gap-1">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(172,198,233,0.18)', color: 'var(--accent)' }}>{n}</span>
                <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety scanner section */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-10">
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck size={20} style={{ color: '#22c55e' }} />
            <div className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Built-in Safety Scanner</div>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            Every token is screened before the bot places a trade. Dangerous tokens are blocked automatically.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              ['🔒', 'Mint Authority', 'Blocks tokens that can print unlimited supply'],
              ['🧊', 'Freeze Authority', 'Blocks tokens that can freeze your balance'],
              ['🍯', 'Honeypot Detection', 'Blocks tokens you cannot sell'],
              ['📊', 'Fake Volume', 'Detects wash trading'],
              ['📉', 'Dev Dump Risk', 'Flags wallets with >20% supply'],
              ['✅', 'Contract Verification', 'Requires open-source code'],
            ].map(([icon, label, desc]) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--surface-muted)' }}>
                <div className="text-base mb-1">{icon}</div>
                <div className="font-semibold text-xs mb-0.5" style={{ color: 'var(--ink)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--subtle)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16 grid md:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl p-6 flex gap-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(172,198,233,0.15)' }}>
              <Icon size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{title}</div>
              <div className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center text-center px-4 pb-20 gap-4">
        <h2 className="display text-3xl font-bold" style={{ color: 'var(--ink)' }}>
          Ready to start?
        </h2>
        <p className="text-base max-w-sm" style={{ color: 'var(--muted)' }}>
          Create your trading wallet in seconds. No browser extension, no sign-up.
        </p>
        <button
          onClick={onLaunch}
          className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}
        >
          Launch App <ArrowRight size={16} />
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-4 flex items-center justify-between text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}>
        <span>ArcStable — USDC AMM + Auto-Trading on Arc</span>
        <a href="https://arc.io" target="_blank" rel="noreferrer" className="hover:underline">Powered by Arc</a>
      </footer>
    </div>
  );
}
