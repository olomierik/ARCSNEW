import { ArrowRight, Zap, Lock, BarChart2, Repeat2 } from 'lucide-react';
import { ConnectKitButton } from 'connectkit';

interface Props {
  onLaunch: () => void;
}

const FEATURES = [
  {
    icon: Repeat2,
    title: 'Near-Zero Slippage',
    desc: 'Curve-style StableSwap (A=100) optimised for stable pairs — ready for USDC/EURC once EURC is live.',
  },
  {
    icon: BarChart2,
    title: 'Real Yield',
    desc: 'veARCS holders earn pro-rata USDC from 4bps swap fees every weekly epoch.',
  },
  {
    icon: Lock,
    title: 'Vote-Escrowed Governance',
    desc: 'Lock ARCS up to 4 years for veARCS. More time locked = more voting power.',
  },
  {
    icon: Zap,
    title: 'Deflationary Engine',
    desc: 'BuybackBurner converts fee revenue into ARCS and burns it to 0xdead.',
  },
];

const STATS = [
  { label: 'Amplification', value: '100' },
  { label: 'Swap Fee', value: '4 bps' },
  { label: 'Weekly Emission', value: '1M ARCS' },
  { label: 'Max Lock', value: '4 years' },
];

export default function LandingPage({ onLaunch }: Props) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="display text-xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
        </span>
        <div className="flex items-center gap-3">
          <ConnectKitButton />
          <button
            onClick={onLaunch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            Launch App <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 gap-6">
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}
        >
          Live on Arc Mainnet
        </div>
        <h1 className="display text-5xl md:text-6xl font-bold max-w-2xl text-balance" style={{ color: 'var(--ink)' }}>
          Stable AMM<br />
          <span style={{ color: 'var(--accent)' }}>Powered by Arc</span>
        </h1>
        <p className="text-lg max-w-lg text-pretty" style={{ color: 'var(--muted)' }}>
          Deposit USDC, earn real yield, and vote with veARCS.
          Built on Arc — where USDC is the native gas token.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={onLaunch}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            Open App <ArrowRight size={16} />
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
      <div className="max-w-4xl mx-auto w-full px-4 pb-12">
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ background: 'var(--border)', border: '1px solid var(--border)' }}
        >
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-6 gap-1" style={{ background: 'var(--surface-muted)' }}>
              <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{s.value}</span>
              <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--subtle)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-24 grid md:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl p-6 flex gap-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(172,198,233,0.15)' }}
            >
              <Icon size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{title}</div>
              <div className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t px-6 py-4 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}>
        <span>ArcStable — Curve-style stable AMM on Arc</span>
        <a href="https://arc.io" target="_blank" rel="noreferrer" className="hover:underline">Powered by Arc</a>
      </footer>
    </div>
  );
}
