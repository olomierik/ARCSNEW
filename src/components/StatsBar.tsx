import { useReadContracts } from 'wagmi';
import { ADDRESSES, POOL_ABI } from '../contracts';
import { arcMainnet } from '../config';
import { formatUnits } from 'viem';

function fmt(val: bigint | undefined, dec: number) {
  if (val === undefined) return '—';
  const n = Number(formatUnits(val, dec));
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(2);
}

export default function StatsBar() {
  const { data } = useReadContracts({
    contracts: [
      { address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'balances', args: [0n], chainId: arcMainnet.id },
      { address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'balances', args: [1n], chainId: arcMainnet.id },
      { address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'totalSupply', chainId: arcMainnet.id },
      { address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'get_virtual_price', chainId: arcMainnet.id },
    ],
  });

  const b0 = data?.[0]?.result;
  const lp = data?.[2]?.result;
  const vp = data?.[3]?.result;

  const tvl = b0 !== undefined
    ? Number(formatUnits(b0, 6)).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '—';

  const vpFmt = vp !== undefined ? Number(formatUnits(vp, 18)).toFixed(6) : '—';

  const items = [
    { label: 'Pool TVL', value: tvl !== '—' ? `$${tvl}` : '—' },
    { label: 'USDC Reserve', value: b0 !== undefined ? fmt(b0, 6) : '—' },
    { label: 'LP Supply', value: lp !== undefined ? fmt(lp, 18) : '—' },
    { label: 'Virtual Price', value: vpFmt },
    { label: 'Weekly Emission', value: '1M ARCS' },
  ];

  return (
    <div
      className="w-full border-b px-4 py-2 flex items-center gap-6 overflow-x-auto text-xs"
      style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.04)' }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 flex-shrink-0">
          <span style={{ color: 'var(--subtle)' }}>{item.label}</span>
          <span className="tabular-nums font-semibold" style={{ color: 'var(--ink-2)' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
