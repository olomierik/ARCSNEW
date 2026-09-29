import { useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Gift } from 'lucide-react';
import { ADDRESSES, REVENUE_DIST_ABI, VEARCS_ABI } from '../contracts';
import { arcMainnet } from '../config';

export default function RewardsPanel() {
  const { address, isConnected } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.REVENUE_DIST, abi: REVENUE_DIST_ABI, functionName: 'claimable', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.REVENUE_DIST, abi: REVENUE_DIST_ABI, functionName: 'token_last_balance', chainId: arcMainnet.id },
      { address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'totalSupply', chainId: arcMainnet.id },
    ],
    query: { enabled: !!address },
  });

  const claimable = data?.[0]?.result;
  const poolBalance = data?.[1]?.result;
  const veBalance = data?.[2]?.result;
  const veTotalSupply = data?.[3]?.result;

  const sharePercent = (veBalance !== undefined && veTotalSupply !== undefined && veTotalSupply > 0n)
    ? ((Number(veBalance) / Number(veTotalSupply)) * 100).toFixed(2)
    : '0.00';

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess) {
      toast.success('USDC yield claimed!', {
        action: txHash ? { label: 'Explorer', onClick: () => window.open(`https://explorer.arc.io/tx/${txHash}`, '_blank') } : undefined,
      });
      void refetch();
    }
  }, [isSuccess, txHash, refetch]);

  function claimYield() {
    writeContract({ address: ADDRESSES.REVENUE_DIST, abi: REVENUE_DIST_ABI, functionName: 'claim', chainId: arcMainnet.id });
  }

  const fmt6 = (v: bigint | undefined) => v !== undefined ? Number(formatUnits(v, 6)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Claimable USDC Yield</span>
          <span className="tabular-nums font-bold text-2xl display" style={{ color: 'var(--success)' }}>
            {fmt6(claimable)}
          </span>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Pool USDC Balance</span>
          <span className="tabular-nums font-bold text-2xl display" style={{ color: 'var(--accent)' }}>
            {fmt6(poolBalance)}
          </span>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-1 col-span-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Your veARCS Share</span>
          <div className="flex items-end gap-2">
            <span className="tabular-nums font-bold text-2xl display" style={{ color: 'var(--ink)' }}>
              {sharePercent}%
            </span>
            <span className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>
              of total veARCS supply
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'var(--surface-muted)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(parseFloat(sharePercent), 100)}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      </div>

      {/* Claim */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Gift size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>Claim USDC Yield</h2>
        </div>
        <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          veARCS holders earn pro-rata USDC from the 4bps swap fee pool. Yield accumulates weekly.
          You receive {sharePercent}% of the total distribution.
        </p>

        {!isConnected ? (
          <div className="text-center text-sm py-1" style={{ color: 'var(--subtle)' }}>Connect wallet</div>
        ) : (
          <button
            onClick={claimYield}
            disabled={loading || !claimable || claimable === 0n}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            <Gift size={14} />
            {loading ? 'Claiming…' : claimable && claimable > 0n ? `Claim ${fmt6(claimable)} USDC` : 'No yield to claim'}
          </button>
        )}

        {txHash && (
          <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1 text-xs hover:underline" style={{ color: 'var(--subtle)' }}>
            <ExternalLink size={11} /> View on Explorer
          </a>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
        Yield is distributed weekly. Lock more ARCS for longer to increase your share.
      </p>
    </div>
  );
}
