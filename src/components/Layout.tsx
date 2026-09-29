import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { Repeat2, Droplets, Lock, Gift, Flame, Palette, Home, Bot } from 'lucide-react';
import StatsBar from './StatsBar';
import SwapPanel from './SwapPanel';
import LiquidityPanel from './LiquidityPanel';
import LockPanel from './LockPanel';
import RewardsPanel from './RewardsPanel';
import TokenomicsPanel from './TokenomicsPanel';
import LogoKit from './LogoKit';
import TradingPanel from './TradingPanel';

type Tab = 'swap' | 'liquidity' | 'lock' | 'rewards' | 'tokenomics' | 'brand' | 'trade';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'swap', label: 'Swap', icon: Repeat2 },
  { id: 'liquidity', label: 'Liquidity', icon: Droplets },
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'tokenomics', label: 'Tokenomics', icon: Flame },
  { id: 'brand', label: 'Brand', icon: Palette },
  { id: 'trade', label: 'AutoTrade', icon: Bot },
];

interface Props {
  onHome: () => void;
}

export default function Layout({ onHome }: Props) {
  const [tab, setTab] = useState<Tab>('swap');

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onHome}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--subtle)' }}
            title="Home"
          >
            <Home size={16} />
          </button>
          <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
            Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
          </span>
        </div>
        <ConnectKitButton />
      </header>

      {/* Stats bar */}
      <StatsBar />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0 transition-all"
            style={
              tab === id
                ? { background: 'rgba(172,198,233,0.18)', color: 'var(--accent)' }
                : { color: 'var(--subtle)' }
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        {tab === 'swap' && <SwapPanel />}
        {tab === 'liquidity' && <LiquidityPanel />}
        {tab === 'lock' && <LockPanel />}
        {tab === 'rewards' && <RewardsPanel />}
        {tab === 'tokenomics' && <TokenomicsPanel />}
        {tab === 'brand' && <LogoKit />}
        {tab === 'trade' && <TradingPanel />}
      </main>
    </div>
  );
}
