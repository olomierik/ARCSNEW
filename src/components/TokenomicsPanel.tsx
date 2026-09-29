import { Flame, TrendingUp, Lock, Repeat2 } from 'lucide-react';

const stats = [
  { label: 'Total Supply', value: '100,000,000', sub: 'ARCS', color: 'var(--accent)' },
  { label: 'Circulating', value: '42,000,000', sub: 'ARCS', color: '#22c55e' },
  { label: 'Locked / veARCS', value: '18,500,000', sub: 'ARCS', color: '#f59e0b' },
  { label: 'Burned', value: '3,200,000', sub: 'ARCS', color: '#ef4444' },
];

const allocations = [
  { label: 'Community & Rewards', pct: 40, color: 'var(--accent)' },
  { label: 'Liquidity',           pct: 25, color: '#22c55e' },
  { label: 'Team (4yr vest)',     pct: 15, color: '#f59e0b' },
  { label: 'Ecosystem Growth',    pct: 12, color: '#a78bfa' },
  { label: 'Reserve',             pct: 8,  color: '#64748b' },
];

export default function TokenomicsPanel() {
  return (
    <div className="w-full max-w-lg flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Flame size={18} style={{ color: 'var(--accent)' }} />
        <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Tokenomics</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-4"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>{s.label}</div>
            <div className="tabular-nums font-bold text-xl" style={{ color: s.color, fontFamily: 'Space Grotesk, sans-serif' }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Allocation bars */}
      <div className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Token Allocation</div>

        {/* Stacked bar */}
        <div className="flex rounded-full overflow-hidden h-3">
          {allocations.map((a) => (
            <div key={a.label} style={{ width: `${a.pct}%`, background: a.color }} />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {allocations.map((a) => (
            <div key={a.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span style={{ color: 'var(--ink-2)' }}>{a.label}</span>
              </div>
              <span className="tabular-nums font-semibold" style={{ color: a.color }}>{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>ARCS Utility</div>
        {[
          { icon: Lock,     text: 'Lock ARCS to mint veARCS and earn protocol fees' },
          { icon: TrendingUp, text: 'veARCS holders receive USDC from swap revenue every epoch' },
          { icon: Repeat2,  text: 'Gauge voting to direct ARCS emissions to liquidity pools' },
          { icon: Flame,    text: 'BuybackBurner uses swap revenue to buy and burn ARCS' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2 text-sm">
            <Icon size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: 'var(--ink-2)' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
