import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { ADDRESSES, POOL_ABI, ERC20_ABI } from '../contracts';
import { arcMainnet } from '../config';

export default function SwapPanel() {
  const { address, isConnected } = useAccount();
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.1');

  const amountInRaw = amountIn
    ? (() => { try { return parseUnits(amountIn, 6); } catch { return undefined; } })()
    : undefined;

  // Quote: USDC (index 0) → USDC (same pool, single token — swap is effectively no-op)
  // The pool is USDC/EURC but since EURC is unavailable the swap tab is
  // repurposed as a USDC deposit-only notice. We keep the quote call wired
  // so the contract infrastructure stays intact for when EURC is added.
  const { data: quoteData } = useReadContract({
    address: ADDRESSES.POOL,
    abi: POOL_ABI,
    functionName: 'get_dy',
    args: amountInRaw ? [0n, 1n, amountInRaw] : undefined,
    chainId: arcMainnet.id,
    query: { enabled: false }, // disabled until EURC is live
  });
  const amountOut = quoteData;

  // USDC allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.POOL as `0x${string}`] : undefined,
    chainId: arcMainnet.id,
    query: { enabled: !!address },
  });
  const allowance = allowanceData;
  const needsApproval = amountInRaw !== undefined && (allowance ?? 0n) < amountInRaw;

  // USDC balance
  const { data: balData } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcMainnet.id,
    query: { enabled: !!address },
  });
  const balance = balData;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    toast.success('Approved!', {
      action: txHash ? { label: 'Explorer', onClick: () => window.open(`https://explorer.arc.io/tx/${txHash}`, '_blank') } : undefined,
    });
    void refetchAllowance();
  }, [isSuccess, txHash, refetchAllowance]);

  // Derive display amount: clear when a tx just succeeded
  const displayAmount = isSuccess ? '' : amountIn;

  function approve() {
    writeContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.POOL as `0x${string}`, maxUint256],
      chainId: arcMainnet.id,
    });
  }

  const loading = isPending || isConfirming;
  void amountOut; // referenced above, silence lint

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>Swap</h2>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
            <span>Slippage</span>
            {['0.05', '0.1', '0.5'].map((v) => (
              <button
                key={v}
                onClick={() => setSlippage(v)}
                className="px-2 py-0.5 rounded-md transition-all"
                style={
                  slippage === v
                    ? { background: 'rgba(172,198,233,0.2)', color: 'var(--accent)' }
                    : { background: 'var(--surface)', color: 'var(--muted)' }
                }
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        {/* Notice banner */}
        <div
          className="rounded-xl px-4 py-3 text-sm text-pretty"
          style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.2)', color: 'var(--muted)' }}
        >
          Swaps are temporarily unavailable. EURC is not yet live on Arc Mainnet. Liquidity can still be added using USDC only.
        </div>

        {/* USDC input (kept for approve flow) */}
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface-muted)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
            {balance !== undefined && (
              <button
                className="text-xs hover:underline"
                style={{ color: 'var(--subtle)' }}
                onClick={() => setAmountIn(formatUnits(balance, 6))}
              >
                Balance: {Number(formatUnits(balance, 6)).toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={displayAmount}
            onChange={(e) => setAmountIn(e.target.value)}
            disabled
            className="flex-1 bg-transparent text-2xl font-semibold tabular-nums outline-none min-w-0 w-full opacity-40 cursor-not-allowed"
            style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}
          />
        </div>

        {/* CTA */}
        {!isConnected ? (
          <div className="text-center text-sm py-2" style={{ color: 'var(--subtle)' }}>Connect wallet to swap</div>
        ) : needsApproval ? (
          <button
            onClick={approve}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            {loading ? 'Approving…' : 'Approve USDC'}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 rounded-xl font-semibold text-sm opacity-40 cursor-not-allowed"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Swap Unavailable
          </button>
        )}

        {txHash && (
          <a
            href={`https://explorer.arc.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 text-xs hover:underline"
            style={{ color: 'var(--subtle)' }}
          >
            <ExternalLink size={11} /> View on Explorer
          </a>
        )}
      </div>

      <p className="text-center text-xs mt-3" style={{ color: 'var(--subtle)' }}>
        Pool fee: 4 bps &middot; Amplification: A=100
      </p>
    </div>
  );
}
