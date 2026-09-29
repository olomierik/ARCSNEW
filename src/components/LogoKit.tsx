import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const BRAND_COLORS = [
  { name: 'Arc Blue',    hex: '#ACC6E9', usage: 'Primary accent' },
  { name: 'Deep Navy',   hex: '#0D1B2F', usage: 'Background' },
  { name: 'Surface',     hex: '#111D30', usage: 'Card background' },
  { name: 'Success',     hex: '#22C55E', usage: 'Positive / profit' },
  { name: 'Warning',     hex: '#F59E0B', usage: 'Alerts / mid cap' },
  { name: 'Danger',      hex: '#EF4444', usage: 'Negative / loss' },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy}
      className="p-1.5 rounded-lg transition-all"
      style={{ background: 'var(--surface-muted)', color: 'var(--subtle)' }}>
      {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} />}
    </button>
  );
}

export default function LogoKit() {
  return (
    <div className="w-full max-w-lg flex flex-col gap-5">
      <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Brand Kit</h2>

      {/* Wordmark */}
      <div className="rounded-2xl p-8 flex flex-col items-center gap-3"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
          Arc<span style={{ color: 'var(--accent)' }}>Stable</span>
        </span>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>The USDC-native AMM on Arc</span>
      </div>

      {/* Icon mark */}
      <div className="rounded-2xl p-6 flex items-center justify-around gap-4"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        {/* Dark bg */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: '#0D1B2F', border: '1px solid var(--border)' }}>
          <span className="text-2xl font-black" style={{ color: '#ACC6E9', fontFamily: 'Space Grotesk, sans-serif' }}>AS</span>
        </div>
        {/* Light bg */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: '#ACC6E9' }}>
          <span className="text-2xl font-black" style={{ color: '#0D1B2F', fontFamily: 'Space Grotesk, sans-serif' }}>AS</span>
        </div>
        {/* Gradient */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0D1B2F 0%, #1a2f4e 100%)', border: '1px solid #ACC6E9' }}>
          <span className="text-2xl font-black" style={{ color: '#ACC6E9', fontFamily: 'Space Grotesk, sans-serif' }}>AS</span>
        </div>
      </div>

      {/* Color palette */}
      <div className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>Brand Colors</div>
        {BRAND_COLORS.map((c) => (
          <div key={c.hex} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: c.hex, border: '1px solid var(--border)' }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.name}</div>
              <div className="text-xs" style={{ color: 'var(--subtle)' }}>{c.usage}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{c.hex}</span>
              <CopyBtn text={c.hex} />
            </div>
          </div>
        ))}
      </div>

      {/* Typography */}
      <div className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <div className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>Typography</div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Display / Headings</div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>Space Grotesk</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Body</div>
          <div className="text-base" style={{ color: 'var(--ink-2)' }}>Inter — Clean, legible, modern</div>
        </div>
      </div>
    </div>
  );
}
